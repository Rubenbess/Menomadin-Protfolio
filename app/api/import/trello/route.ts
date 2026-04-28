import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

const COLORS = ['blue', 'indigo', 'purple', 'amber', 'orange', 'green', 'red', 'slate']

interface TrelloLabel { name: string; color: string }
interface TrelloCard {
  id: string
  name: string
  desc: string
  idList: string
  labels: TrelloLabel[]
  closed: boolean
}
interface TrelloList { id: string; name: string; closed: boolean }
interface TrelloBoard { lists: TrelloList[]; cards: TrelloCard[] }

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if ('response' in auth) return auth.response
    const { supabase } = auth

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    let board: TrelloBoard
    try {
      board = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 })
    }

    if (!board.lists || !board.cards) {
      return NextResponse.json({ error: 'File does not look like a Trello export' }, { status: 400 })
    }

    // Get existing stages (supabase from requireAuth above)
    const { data: existingStages } = await supabase
      .from('pipeline_stages')
      .select('name, position')
      .order('position', { ascending: false })

    const existingNames = new Set((existingStages ?? []).map((s: { name: string }) => s.name))
    const nextPosition = existingStages?.length ? (existingStages[0].position + 1) : 0

    // Create stages from Trello lists (skip archived, skip existing)
    const activeLists = board.lists.filter(l => !l.closed)
    const listMap: Record<string, string> = {} // id → name
    let stagesCreated = 0

    for (let i = 0; i < activeLists.length; i++) {
      const list = activeLists[i]
      listMap[list.id] = list.name
      if (!existingNames.has(list.name)) {
        const color = COLORS[i % COLORS.length]
        await supabase.from('pipeline_stages').insert({
          name: list.name,
          color,
          position: nextPosition + i,
        })
        stagesCreated++
      }
    }

    // Also map archived lists so we can still reference cards in them
    board.lists.filter(l => l.closed).forEach(l => { listMap[l.id] = l.name })

    // Import cards (skip archived)
    const activeCards = board.cards.filter(c => !c.closed)
    let cardsCreated = 0
    const errors: string[] = []

    // Fetch existing pipeline entry names to avoid duplicates
    const { data: existingEntries } = await supabase.from('pipeline').select('name')
    const existingEntryNames = new Set((existingEntries ?? []).map((e: { name: string }) => e.name.toLowerCase()))

    for (const card of activeCards) {
      const status = listMap[card.idList]
      if (!status) {
        errors.push(`Card "${card.name}" skipped — list not found`)
        continue
      }
      if (existingEntryNames.has(card.name.toLowerCase())) {
        continue // skip duplicates
      }
      const sector = card.labels.find(l => l.name)?.name ?? ''
      const { error } = await supabase.from('pipeline').insert({
        name: card.name,
        sector,
        stage: '',
        status,
        notes: card.desc || null,
      })
      if (error) {
        errors.push(`Card "${card.name}": ${error.message}`)
      } else {
        cardsCreated++
      }
    }

    return NextResponse.json({
      results: { stagesCreated, cardsCreated, errors },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 }
    )
  }
}
