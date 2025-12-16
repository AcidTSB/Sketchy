import { ipcMain } from 'electron'
import { prisma } from '../db/client'
import { log } from '../utils/logger'

/**
 * CHECKLIST & NOTES SYSTEM
 * JSON-based notes and checklist management stored in project.notesJson
 */

interface ChecklistItem {
  text: string
  completed: boolean
}

interface ChecklistData {
  notes: string[]
  checklist: ChecklistItem[]
  priority: 'low' | 'medium' | 'high' | null
  deadline: string | null
}

export function registerChecklistHandlers() {
  const DEFAULT_CHECKLIST_DATA: ChecklistData = {
    notes: [],
    checklist: [],
    priority: null,
    deadline: null,
  }

  // Get checklist data for a project
  ipcMain.handle('get-checklist', async (_event, projectId: number) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { notesJson: true },
      })

      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      let data: ChecklistData = DEFAULT_CHECKLIST_DATA
      if (project.notesJson) {
        try {
          data = JSON.parse(project.notesJson)
        } catch (e) {
          // If JSON is invalid, return default
          log.warn({ projectId }, 'Invalid notesJson, using default')
        }
      }

      return { success: true, data }
    } catch (error) {
      log.error({ error, projectId }, 'Failed to get checklist')
      return { success: false, error: 'Failed to get checklist' }
    }
  })

  // Update checklist data for a project
  ipcMain.handle(
    'update-checklist',
    async (_event, projectId: number, data: Partial<ChecklistData>) => {
      try {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { notesJson: true },
        })

        if (!project) {
          return { success: false, error: 'Project not found' }
        }

        // Get existing data
        let existing: ChecklistData = DEFAULT_CHECKLIST_DATA
        if (project.notesJson) {
          try {
            existing = JSON.parse(project.notesJson)
          } catch (e) {
            // If JSON is invalid, use default
          }
        }

        // Merge with new data
        const updated: ChecklistData = {
          notes: data.notes ?? existing.notes ?? [],
          checklist: data.checklist ?? existing.checklist ?? [],
          priority: data.priority !== undefined ? data.priority : existing.priority,
          deadline: data.deadline !== undefined ? data.deadline : existing.deadline,
        }

        await prisma.project.update({
          where: { id: projectId },
          data: { notesJson: JSON.stringify(updated) },
        })

        log.info({ projectId }, 'Checklist updated')
        return { success: true, data: updated }
      } catch (error) {
        log.error({ error, projectId }, 'Failed to update checklist')
        return { success: false, error: 'Failed to update checklist' }
      }
    }
  )
}
