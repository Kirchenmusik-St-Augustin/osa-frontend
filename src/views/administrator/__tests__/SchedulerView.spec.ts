import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SchedulerView from '../SchedulerView.vue'
import type { BackupTrigger, DownsyncTrigger, ScheduledJob } from '@/composables/useScheduler'

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

// vi.mock(...) factories are hoisted above plain const declarations --
// referencing mock functions inside them requires vi.hoisted().
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn().mockResolvedValue(undefined) }))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockLogout = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ logout: mockLogout }),
}))

function makeJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: 'purge_stale_booking_requests',
    name: 'purge_stale_booking_requests',
    trigger: 'cron[minute=0]',
    next_run: '13.08.2026, 15:00',
    description: 'Löscht stündlich offene Buchungsanfragen.',
    ...overrides,
  }
}

function makeBackupTrigger(overrides: Partial<BackupTrigger> = {}): BackupTrigger {
  return {
    backup_name: 'production-2026-08-13_12-00-00-manual.tar.gz',
    triggered_at: '2026-08-13T12:00:00+00:00',
    ...overrides,
  }
}

function makeDownsyncTrigger(overrides: Partial<DownsyncTrigger> = {}): DownsyncTrigger {
  return {
    restored_backup: 'production-2026-08-21_04-00-00.tar.gz',
    triggered_at: '2026-08-21T04:00:00+00:00',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAppEnvironment = undefined
  mockConfirmAction.mockResolvedValue(true)
  mockLogout.mockResolvedValue(undefined)
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

  it('triggers a backup and shows a success toast with the backup name', async () => {
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockTriggerBackup.mockResolvedValueOnce(makeBackupTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockTriggerBackup).toHaveBeenCalledOnce()
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('production-2026-08-13_12-00-00-manual.tar.gz'),
    )
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
  })

  it('disables the backup button while the request is in flight', async () => {
    mockAppEnvironment = 'production'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    let resolveTrigger: (value: BackupTrigger) => void = () => {}
    mockTriggerBackup.mockReturnValueOnce(
      new Promise<BackupTrigger>((resolve) => {
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

  it('does nothing when the downsync confirm dialog is cancelled', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockConfirmAction.mockResolvedValueOnce(false)

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockTriggerDownsync).not.toHaveBeenCalled()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('triggers a downsync, shows a success toast, logs out and redirects to login', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockTriggerDownsync.mockResolvedValueOnce(makeDownsyncTrigger())

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockTriggerDownsync).toHaveBeenCalledOnce()
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('production-2026-08-21_04-00-00.tar.gz'),
    )
    expect(mockLogout).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('shows an error toast without logging out when triggering a downsync fails', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    mockTriggerDownsync.mockRejectedValueOnce(new Error('restore failed'))

    const wrapper = mount(SchedulerView)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), true)
    expect(mockLogout).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('disables the downsync button while the request is in flight', async () => {
    mockAppEnvironment = 'development'
    mockListScheduledJobs.mockResolvedValueOnce([makeJob()])
    let resolveTrigger: (value: DownsyncTrigger) => void = () => {}
    mockTriggerDownsync.mockReturnValueOnce(
      new Promise<DownsyncTrigger>((resolve) => {
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
