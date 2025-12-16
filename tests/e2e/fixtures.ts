import { test as base, expect as baseExpect, _electron as electron } from '@playwright/test'

type ElectronApp = Awaited<ReturnType<typeof electron.launch>>

export const test = base.extend<{ electronApp: ElectronApp }>({
  electronApp: async (_fixtures, use) => {
    const app = await electron.launch({
      args: ['electron/dist/main.js'],
    })
    await use(app)
    await app.close()
  },
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await use(page)
  },
})

export const expect = baseExpect
