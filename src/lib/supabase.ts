import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' // Replace with actual key from Supabase Studio

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Event emitter for database persistence - INSERT ONLY
export async function emitEvent(sessionId: string, event: any) {
  try {
    const insertData = {
      session_id: sessionId,
      parent_event_id: event.parent_event_id || null,
      type: event.type,
      payload: event,
      depth: event.depth || 0
    }
    
    console.log('Inserting event:', insertData)
    
    const { data, error } = await supabase
      .from('events')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Database insert error:', error)
      throw error
    }
    
    console.log('Event inserted successfully:', data)
    return data
  } catch (error) {
    console.error('Error emitting event:', error)
    throw error
  }
}

// Session creator
export async function createSession(problemType: string, input: any) {
  try {
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        problem_type: problemType,
        input: input
      })
      .select()
      .single()

    if (error) throw error
    return session
  } catch (error) {
    console.error('Error creating session:', error)
    throw error
  }
}

// Event fetcher for UI
export async function fetchEvents(sessionId: string) {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return events
  } catch (error) {
    console.error('Error fetching events:', error)
    throw error
  }
}
