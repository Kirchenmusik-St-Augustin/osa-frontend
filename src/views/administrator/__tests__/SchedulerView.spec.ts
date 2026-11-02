import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SchedulerView from '../SchedulerView.vue'
import type { JobQueued, JobRun, ScheduledJob } from '@/composables/useScheduler'

const mockListScheduledJobs = vi.fn()
const mockTriggerBackup = vi.fn()
const mockTriggerDownsync = vi.fn()
vi.mock('@/composables/useScheduler', () => ({
  useScheduler: () => ({
    listScheduledJobs: mockListScheduledJobs,
    triggerBackup: mockTriggerBackup,
    triggerDownsync: mockTriggerDownsync,
  }),
}))

let mockAppEnvironment: string | undefined
vi.mock('@/runtimeConfig', () => ({
  appEnvironment: () => mockAppEnvironment,
}))

const mockShowToast = vi.fn()
const mockConfirmAction = vi.fn()
vi.mock('@/services/notifications', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
}))

let mockCanTrigger: boolean
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: (permission: string) => permission === 'schedulerTrigger' && mockCanTrigger,
  }),
}))

function makeJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: 'purge_stale_booking_requests',
    name: 'purge_stale_booking_requests',
    trigger: 'cron[minute=0]',
    next_run: '13.08.2026, 15:00',
    description: 'Löscht stündlich offene Buchungsanfragen.',
    last_run: null,
    ...overrides,
  }
}

function makeJobRun(overrides: Partial<JobRun> = {}): JobRun {
  return {
    status: 'success',
    output: null,
    started_at: '2026-08-13T14:59:58+00:00',
    finished_at: '2026-08-13T15:00:00+00:00',
    ...overrides,
  }
}

function makeBackupTrigger(overrides: Partial<JobQueued> = {}): JobQueued {
  return { job_id: 'backup_koofr', queued_at: '2026-08-13T12:00:00+00:00', ...overrides }
}

function makeDownsyncTrigger(overrides: Partial<JobQueued> = {}): JobQueued {
  return { job_id: 'downsync', queued_at: '2026-08-21T04:00:00+00:00', ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAppEnvironment = undefined
  mockCanTrigger = true
  mockConfirmAction.mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
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
    expect(wrapper.text()).toContain('cron[minute=0]')
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

  it('shows a dash for last_run when the job has never run', async () => {
    mockListScheduledJobs.mockResolvedValueOnce([makeJob({ last_run: null })])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.find('.badge.text-bg-success').exists()).toBe(false)
    expect(wrapper.find('.badge.text-bg-danger').exists()).toBe(false)
  })

  it('renders a success badge with the finished_at date for a successful last run', async () => {
    mockListScheduledJobs.mockResolvedValueOnce([
      makeJob({ last_run: makeJobRun({ status: 'success' }) }),
    ])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    const badge = wrapper.find('.badge.text-bg-success')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toMatch(/2026/)
  })

  it('renders a failure badge for a failed last run, with the output as its tooltip', async () => {
    mockListScheduledJobs.mockResolvedValueOnce([
      makeJob({
        last_run: makeJobRun({ status: 'failure', output: 'Koofr upload failed' }),
      }),
    ])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    const badge = wrapper.find('.badge.text-bg-danger')
    expect(badge.exists()).toBe(true)
    expect(badge.attributes('title')).toBe('Koofr upload failed')
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

  it('shows the server text, or a fixed text for a field-only answer, when loading jobs fails', async () => {
    mockListScheduledJobs.mockRejectedValueOnce({
      response: { data: { detail: 'Keine Berechtigung.' } },
    })
    mount(SchedulerView)
    await flushPromises()
    expect(mockShowToast).toHaveBeenLastCalledWith('Keine Berechtigung.', true)

    mockListScheduledJobs.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })
    mount(SchedulerView)
    await flushPromises()
    expect(mockShowToast).toHaveBeenLastCalledWith(
      'Scheduler-Übersicht konnte nicht geladen werden.',
      true,
    )
  })

  it('renders no "Historie" element regardless of stage (no history feature exists)', async () => {
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Historie')
  })

  it('renders the backup button on the production stage', async () => {
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Backup jetzt erstellen')
    expect(wrapper.text()).toContain('nach Koofr')
    expect(wrapper.text()).not.toContain('Downsync jetzt durchführen')
  })

  it('queues a backup and says where the result will show up', async () => {
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValue([makeJob()])
    mockTriggerBackup.mockResolvedValueOnce(makeBackupTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockTriggerBackup).toHaveBeenCalledOnce()
    expect(mockShowToast).toHaveBeenCalledWith(
      'Backup wurde gestartet. Das Ergebnis steht unter „Letzter Lauf“ der Task backup_koofr.',
    )
  })

  it('reloads the job list right after queueing a backup and once more after a delay', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValue([makeJob()])
    mockTriggerBackup.mockResolvedValueOnce(makeBackupTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    expect(mockListScheduledJobs).toHaveBeenCalledTimes(1)

    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mockListScheduledJobs).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(4999)
    expect(mockListScheduledJobs).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(mockListScheduledJobs).toHaveBeenCalledTimes(3)
  })

  it('shows the new last run of the backup job after the delayed reload', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mockAppEnvironment = 'production'
    mockListScheduledJobs
      .mockResolvedValueOnce([makeJob({ id: 'backup_koofr', last_run: null })])
      .mockResolvedValueOnce([makeJob({ id: 'backup_koofr', last_run: null })])
      .mockResolvedValueOnce([
        makeJob({
          id: 'backup_koofr',
          last_run: makeJobRun({ status: 'failure', output: 'Koofr upload failed' }),
        }),
      ])
    mockTriggerBackup.mockResolvedValueOnce(makeBackupTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.badge.text-bg-danger').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(5000)

    expect(wrapper.find('.badge.text-bg-danger').attributes('title')).toBe('Koofr upload failed')
  })

  it('does not reload the list after the view is gone', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValue([makeJob()])
    mockTriggerBackup.mockResolvedValueOnce(makeBackupTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    wrapper.unmount()

    await vi.advanceTimersByTimeAsync(10000)

    expect(mockListScheduledJobs).toHaveBeenCalledTimes(2)
  })

  it('keeps a single delayed reload when the backup is queued twice in a row', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValue([makeJob()])
    mockTriggerBackup.mockResolvedValue(makeBackupTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2000)
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mockListScheduledJobs).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(10000)

    expect(mockListScheduledJobs).toHaveBeenCalledTimes(4)
  })

  it('shows an error toast when triggering a backup fails', async () => {
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockTriggerBackup.mockRejectedValueOnce(new Error('upload failed'))

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), true)
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.stringContaining('gestartet'))
    expect(mockListScheduledJobs).toHaveBeenCalledTimes(1)
  })

  it('shows the fixed backup error text for a field-only answer', async () => {
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockTriggerBackup.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Backup konnte nicht erstellt werden.', true)
  })

  it('disables the backup button while the request is in flight', async () => {
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    let resolveTrigger: (value: JobQueued) => void = () => {}
    mockTriggerBackup.mockReturnValueOnce(
      new Promise<JobQueued>((resolve) => {
        resolveTrigger = resolve
      }),
    )

    const wrapper = mount(SchedulerView)
    await flushPromises()
    const button = wrapper.find('button')
    await button.trigger('click')

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()

    resolveTrigger(makeBackupTrigger())
    await flushPromises()

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('renders the downsync button outside the production stage', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Downsync jetzt durchführen')
    expect(wrapper.text()).not.toContain('Backup jetzt erstellen')
  })

  it.each(['production', 'development'])(
    'shows no trigger button on %s without the schedulerTrigger permission',
    async (environment) => {
      mockAppEnvironment = environment
      mockCanTrigger = false
      mockListScheduledJobs.mockResolvedValueOnce([makeJob()])

      const wrapper = mount(SchedulerView)
      await flushPromises()

      expect(wrapper.find('button').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Backup jetzt erstellen')
      expect(wrapper.text()).not.toContain('Downsync jetzt durchführen')
      expect(wrapper.findAll('.card')).toHaveLength(1)
    },
  )

  it('does nothing when the downsync confirm dialog is cancelled', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockConfirmAction.mockResolvedValueOnce(false)

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockTriggerDownsync).not.toHaveBeenCalled()
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('warns in the confirm dialog that the user has to sign in again afterwards', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockTriggerDownsync.mockResolvedValueOnce(makeDownsyncTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockConfirmAction).toHaveBeenCalledWith(
      'Downsync ersetzt die lokale Datenbank dieser Stage mit dem aktuellen Produktivstand. ' +
        'Danach musst du dich neu anmelden. Fortfahren?',
    )
  })

  it('queues a downsync and says where the result will show up and that a new sign-in follows', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValue([makeJob()])
    mockTriggerDownsync.mockResolvedValueOnce(makeDownsyncTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockTriggerDownsync).toHaveBeenCalledOnce()
    expect(mockShowToast).toHaveBeenCalledWith(
      'Downsync wurde gestartet. Das Ergebnis steht unter „Letzter Lauf“ der Task downsync. ' +
        'Danach musst du dich neu anmelden.',
    )
  })

  it('does not reload the list after queueing a downsync, the session ends with the restore', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValue([makeJob()])
    mockTriggerDownsync.mockResolvedValueOnce(makeDownsyncTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(10000)

    expect(mockListScheduledJobs).toHaveBeenCalledTimes(1)
  })

  it('tells the user on the downsync card that a new sign-in is needed afterwards', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])

    const wrapper = mount(SchedulerView)
    await flushPromises()

    expect(wrapper.text()).toContain('Danach musst du dich neu anmelden.')
    expect(wrapper.text()).not.toContain('automatisch ab')
  })

  it('shows an error toast and no success text when triggering a downsync fails', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockTriggerDownsync.mockRejectedValueOnce(new Error('restore failed'))

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), true)
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.stringContaining('gestartet'))
  })

  it('shows the fixed downsync error text for a field-only answer', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockTriggerDownsync.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Downsync konnte nicht durchgeführt werden.', true)
  })

  it('disables the downsync button while the request is in flight', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    let resolveTrigger: (value: JobQueued) => void = () => {}
    mockTriggerDownsync.mockReturnValueOnce(
      new Promise<JobQueued>((resolve) => {
        resolveTrigger = resolve
      }),
    )

    const wrapper = mount(SchedulerView)
    await flushPromises()
    const button = wrapper.find('button')
    await button.trigger('click')
    await flushPromises()

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()

    resolveTrigger(makeDownsyncTrigger())
    await flushPromises()

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })
})
