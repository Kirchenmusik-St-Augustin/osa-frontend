import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DateTimePicker from '../DateTimePicker.vue'
import { toWallClockString } from '@/services/dateFormat'

const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('DateTimePicker on a mobile user agent', () => {
  it('keeps the Flatpickr calendar (15-minute steps) instead of the native input', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(IPHONE_USER_AGENT)
    const future = new Date()
    future.setDate(future.getDate() + 30)

    mount(DateTimePicker, {
      props: { modelValue: toWallClockString(future) },
      attachTo: document.body,
    })

    expect(document.querySelector('.flatpickr-mobile')).toBeNull()
    expect(document.querySelector('input.flatpickr-input')).not.toBeNull()
  })
})
