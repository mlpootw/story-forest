// 寫入閱讀紀錄：確保公共書／私人書只建一次、孩子書房只建一次，再新增一筆共讀
import { supabase } from './supabase'
import { compressImage, ymOf, shiftMonth } from './books'

const BOOK_FIELDS = ['isbn13', 'isbn10', 'title', 'authors', 'publisher', 'published_date', 'description', 'subjects', 'cover_url', 'cover_source', 'source', 'source_id', 'language']
const pick = (b) => Object.fromEntries(BOOK_FIELDS.map((k) => [k, b[k] ?? null]).map(([k, v]) => [k, v === null && (k === 'authors' || k === 'subjects') ? [] : v]))

export async function uploadCover(familyId, file) {
  const { blob, type } = await compressImage(file)
  const path = `${familyId}/${crypto.randomUUID()}.${type === 'image/webp' ? 'webp' : 'jpg'}`
  const { error } = await supabase.storage.from('covers').upload(path, blob, { contentType: type, cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
}

// 回傳書籍 id（已存在就沿用，不重複建立）
export async function ensureBook({ book, familyId, userId, suggested }) {
  if (book.id) return book.id
  if (book.isbn13) {
    const { data: pub } = await supabase.from('books').select('id').eq('isbn13', book.isbn13).is('owner_family_id', null).maybeSingle()
    if (pub) return pub.id
  }
  const isPublic = book.isbn13 && (book.source === 'google' || book.source === 'openlibrary')
  if (!isPublic && book.isbn13) {
    const { data: mine } = await supabase.from('books').select('id').eq('isbn13', book.isbn13).eq('owner_family_id', familyId).maybeSingle()
    if (mine) return mine.id
  }
  const row = {
    ...pick(book),
    source: isPublic ? book.source : 'manual',
    suggested_category: suggested || null,
    owner_family_id: isPublic ? null : familyId,
    created_by: userId
  }
  const { data, error } = await supabase.from('books').insert(row).select('id').single()
  if (error) {
    // 剛好有人同時建立同一本公共書：改用已存在的那一筆
    if (isPublic && /duplicate|unique/i.test(error.message)) {
      const { data: again } = await supabase.from('books').select('id').eq('isbn13', book.isbn13).is('owner_family_id', null).single()
      return again.id
    }
    throw error
  }
  return data.id
}

export async function ensureChildBook({ childId, bookId, familyId, categoryId, isEnglish }) {
  const { data: cb } = await supabase.from('child_books').select('id, category_id, is_english').eq('child_id', childId).eq('book_id', bookId).maybeSingle()
  if (cb) {
    const patch = {}
    if (categoryId !== undefined && categoryId !== cb.category_id) patch.category_id = categoryId
    if (isEnglish !== undefined && isEnglish !== cb.is_english) patch.is_english = isEnglish
    if (Object.keys(patch).length) await supabase.from('child_books').update(patch).eq('id', cb.id)
    return { id: cb.id, existed: true }
  }
  const { data, error } = await supabase.from('child_books')
    .insert({ child_id: childId, book_id: bookId, family_id: familyId, category_id: categoryId ?? null, is_english: isEnglish ?? null })
    .select('id').single()
  if (error) throw error
  return { id: data.id, existed: false }
}

// 新增一筆共讀；回傳這個月是不是第一次讀（新葉子）
export async function addSession({ childBookId, childId, bookId, familyId, readOn, note, extra }) {
  const month = ymOf(readOn)
  const { count } = await supabase.from('reading_sessions').select('id', { count: 'exact', head: true })
    .eq('child_book_id', childBookId).gte('read_on', month + '-01').lt('read_on', shiftMonth(month, 1) + '-01')
  const { error } = await supabase.from('reading_sessions').insert({
    child_book_id: childBookId, child_id: childId, book_id: bookId, family_id: familyId,
    read_on: readOn, note: note?.trim() || null,
    ...(extra || {}) // 雜誌：issue、issue_cover_url、has_english
  })
  if (error) throw error
  return { newLeaf: !count }
}
