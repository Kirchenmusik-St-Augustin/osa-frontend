import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SchedulerView from '../SchedulerView.vue'
import type { ScheduledJob } from '@/composables/useScheduler'

const mockListScheduledJobs = vi.fn()
vi.mock('@/composables/useScheduler', () => ({
  useScheduler: () => ({ listScheduledJobs: mockListScheduledJobs }),
}))

const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

function makeJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: 'purge_stale_booking_requests',
    name: 'purge_stale_booking_requests',
    trigger: 'interval[1:00:00]',
    next_run: '13.08.2026, 15:00',
    description: 'Löscht stündlich offene Buchungsanfragen.',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SchedulerView', () => {
  it('renders one card per job with id, trigger and next_run', async () => {
    mockListScheduledJobs.mockResolvedValueOnce([
      makeJob(),
      makeJob({ id: 'backup_koofr', name: 'backup_koofr', trigger: 'cron[hour=10]' }),
    ])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.findAll('.card')).toHaveLength(2)
    expect(wrapper.text()).toContain('purge_stale_booking_requests')
    expect(wrapper.text()).toContain('interval[1:00:00]')
    expect(wrapper.text()).toContain('13.08.2026, 15:00')
  })

  it('shows a dash for a job with next_run null', async () => {
    mockListScheduledJobs.mockResolvedValueOnce([makeJob({ next_run: null })])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.text()).toContain('–')
  })

  it('does not render a description paragraph when description is null', async () => {
    mockListScheduledJobs.mockResolvedValueOnce([makeJob({ description: null })])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.find('.card-text').exists()).toBe(false)
  })

  it('shows the empty-state text when the job list is empty', async () => {
    mockListScheduledJobs.mockResolvedValueOnce([])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.text()).toContain('Aktuell sind keine Scheduled Tasks registriert.')
    expect(wrapper.findAll('.card')).toHaveLength(0)
  })

  it('shows an error toast when loading jobs fails', async () => {
    mockListScheduledJobs.mockRejectedValueOnce(new Error('network error'))

    mount(SchedulerView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), true)
  })

  it('renders no trigger button or history link (reduced scope, no run-history/actions)', async () => {
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Historie')
    expect(wrapper.text()).not.toContain('Backup')
    expect(wrapper.text()).not.toContain('Downsync')
  })
})
