// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { useLatestResult } from '../useLatestResult'

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useLatestResult', () => {
  it('applies the answer of a single call', async () => {
    const applyLatest = useLatestResult()
    const apply = vi.fn()

    await applyLatest(async () => 'result', apply)

    expect(apply).toHaveBeenCalledWith('result')
  })

  it('drops an older answer that arrives after the answer to the newer call', async () => {
    const applyLatest = useLatestResult()
    const apply = vi.fn()
    const first = deferred<string>()
    const second = deferred<string>()

    const firstCall = applyLatest(() => first.promise, apply)
    const secondCall = applyLatest(() => second.promise, apply)
    second.resolve('new')
    await secondCall
    first.resolve('old')
    await firstCall

    expect(apply).toHaveBeenCalledOnce()
    expect(apply).toHaveBeenCalledWith('new')
  })

  it('also drops an older answer that arrives before the newer one is done', async () => {
    const applyLatest = useLatestResult()
    const apply = vi.fn()
    const first = deferred<string>()
    const second = deferred<string>()

    const firstCall = applyLatest(() => first.promise, apply)
    const secondCall = applyLatest(() => second.promise, apply)
    first.resolve('old')
    await firstCall
    expect(apply).not.toHaveBeenCalled()
    second.resolve('new')
    await secondCall

    expect(apply).toHaveBeenCalledExactlyOnceWith('new')
  })

  it('lets a failing load reach the caller without applying anything', async () => {
    const applyLatest = useLatestResult()
    const apply = vi.fn()

    await expect(
      applyLatest(async () => {
        throw new Error('boom')
      }, apply),
    ).rejects.toThrow('boom')
    expect(apply).not.toHaveBeenCalled()
  })
})
