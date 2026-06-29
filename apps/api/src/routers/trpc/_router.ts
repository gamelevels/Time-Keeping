import { router } from './trpc'
import { timesheetsRouter } from './timesheets'
import { employeesRouter } from './employees'
import { jobSitesRouter } from './jobSites'

export const appRouter = router({
  timesheets: timesheetsRouter,
  employees: employeesRouter,
  jobSites: jobSitesRouter,
})

export type AppRouter = typeof appRouter
