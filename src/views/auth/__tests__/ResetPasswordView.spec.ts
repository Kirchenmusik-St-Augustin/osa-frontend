import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResetPasswordView from '../ResetPasswordView.vue'
import api from '@/services/api'

const mockPush = vi.fn().mockResolvedValue(undefined)
const mockRoute = { query: {} as Record<string, string> }
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => mockRoute,
}))

vi.mock('@/services/api', () => ({
  default: { post: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
  mockRoute.query = { token: 'reset-token-abc', email: 'a@example.com' }
})

describe('ResetPasswordView', () => {
  it('pre-fills email and token from the URL query', () => {
    const wrapper = mount(ResetPasswordView)

    expect((wrapper.find('input#email').element as HTMLInputElement).value).toBe('a@example.com')
  })

  it('submits the reset and redirects to login on success', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { status: 'ok' } })
    const wrapper = mount(ResetPasswordView)

    await wrapper.find('input#password').setValue('Passw0rd1')
    await wrapper.find('input#password_confirmation').setValue('Passw0rd1')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/reset-password', {
      email: 'a@example.com',
      token: 'reset-token-abc',
      password: 'Passw0rd1',
      password_confirmation: 'Passw0rd1',
    })
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('shows the invalid-token error message under the email field', async () => {
    mockedApi.post.mockRejectedValueOnce({
      response: { data: { detail: 'Der angegebene Token zur Passwort-Rücksetzung ist ungültig.' } },
    })
    const wrapper = mount(ResetPasswordView)

    await wrapper.find('input#password').setValue('Passw0rd1')
    await wrapper.find('input#password_confirmation').setValue('Passw0rd1')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain(
        'Der angegebene Token zur Passwort-Rücksetzung ist ungültig.',
      ),
    )

    expect(mockPush).not.toHaveBeenCalled()
  })
})
