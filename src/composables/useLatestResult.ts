// Overlapping loads of the same view state (switching month, table or page
// faster than the server answers) finish in arbitrary order. Each call to the
// returned function supersedes the earlier ones: only the answer to the most
// recent call is applied, an older answer that arrives late is dropped. The
// error of the most recent call reaches the caller; the error of a superseded
// call is dropped as well, because nobody waits for that answer any more and
// reporting it would wipe a screen that was loaded correctly in the meantime.
export function useLatestResult() {
  let latestCall = 0

  return async function applyLatest<T>(
    load: () => Promise<T>,
    apply: (value: T) => void,
  ): Promise<void> {
    latestCall += 1
    const thisCall = latestCall
    let value: T
    try {
      value = await load()
    } catch (error) {
      if (thisCall === latestCall) throw error
      return
    }
    if (thisCall === latestCall) apply(value)
  }
}
