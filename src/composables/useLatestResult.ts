// Overlapping loads of the same view state (switching month, table or page
// faster than the server answers) finish in arbitrary order. Each call to the
// returned function supersedes the earlier ones: only the answer to the most
// recent call is applied, an older answer that arrives late is dropped.
// Errors of `load` still reach the caller.
export function useLatestResult() {
  let latestCall = 0

  return async function applyLatest<T>(
    load: () => Promise<T>,
    apply: (value: T) => void,
  ): Promise<void> {
    latestCall += 1
    const thisCall = latestCall
    const value = await load()
    if (thisCall === latestCall) apply(value)
  }
}
