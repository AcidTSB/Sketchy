import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, FileAudio, Music, X, Mic } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { useUserStore } from '@/store/userStore'
import { useToast } from '@/components/Toast'
import { useClickOutside } from '@/hooks/useClickOutside'
import ImageCropModal from './ImageCropModal'

// Helper function to convert blob URL to base64
const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
  const response = await fetch(blobUrl)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function FloatingAddButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [projectCoverArt, setProjectCoverArt] = useState<string>('')
  const [tempImageForCrop, setTempImageForCrop] = useState<string>('')
  const [showCropModal, setShowCropModal] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  // 1. SỬA: Bỏ 'loadProjects' vì không dùng đến
  const { currentProject, createProject } = useProjectStore()
  const { isAuthenticated } = useUserStore()
  const toast = useToast()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOpenProjectModal = () => setShowProjectModal(true)
    window.addEventListener('openNewProjectModal', handleOpenProjectModal)
    return () => {
      window.removeEventListener('openNewProjectModal', handleOpenProjectModal)
    }
  }, [])

  useClickOutside(dropdownRef, () => {
    if (isOpen) {
      setIsOpen(false)
    }
  })

  if (!isAuthenticated || location.pathname.startsWith('/player/')) {
    return null
  }

  const toggleMenu = () => setIsOpen(!isOpen)

  const handleAction = (action: string) => {
    setIsOpen(false)

    switch (action) {
      case 'audio':
        if (location.pathname !== '/') {
          navigate('/', { state: { openImportModal: true } })
        } else {
          window.dispatchEvent(new CustomEvent('openImportModal'))
        }
        break
      case 'record':
        if (currentProject) {
          navigate(`/record/${currentProject.id}`)
        } else {
          toast.info('Please select or create a project first')
        }
        break
      case 'project':
        setShowProjectModal(true)
        break
    }
  }

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    try {
      // Chuyển blob URL sang base64 nếu có cover art
      let coverArtBase64 = projectCoverArt
      if (projectCoverArt && projectCoverArt.startsWith('blob:')) {
        coverArtBase64 = await blobUrlToBase64(projectCoverArt)
      }

      // Gọi hàm từ Store với coverArt
      await createProject(projectName.trim(), projectDesc.trim(), coverArtBase64)

      setShowProjectModal(false)
      setProjectName('')
      setProjectDesc('')
      setProjectCoverArt('')

      // Navigate về trang chủ
      navigate('/')

      // 2. SỬA: Tạm thời comment dòng này lại vì Store không trả về ID để log
      // trackActivity('create', 'project', undefined, { name: projectName })
    } catch (error) {
      console.error(error)
    }
  }

  const handleCoverArtSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setTempImageForCrop(event.target?.result as string)
          setShowCropModal(true)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleCropComplete = (croppedImage: string) => {
    setProjectCoverArt(croppedImage)
    setShowCropModal(false)
    setTempImageForCrop('')
  }

  return (
    <>
      <div className="relative transition-all duration-300" ref={dropdownRef}>
        {isOpen && (
          <div
            className="absolute bottom-full mb-3"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="rounded-apple-lg shadow-apple-lg overflow-hidden animate-scale-in"
              style={{
                width: '180px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--systemQuaternary)',
              }}
            >
              <button
                onClick={() => handleAction('audio')}
                className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity border-b"
                style={{ borderColor: 'var(--surface)' }}
              >
                <FileAudio className="h-5 w-5" style={{ color: 'var(--text)' }} />
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  Audio
                </span>
              </button>

              <button
                onClick={() => handleAction('record')}
                className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity border-b"
                style={{ borderColor: 'var(--surface)' }}
              >
                <Mic className="h-5 w-5" style={{ color: 'var(--systemError)' }} />
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  Record
                </span>
              </button>

              <button
                onClick={() => handleAction('project')}
                className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <Music className="h-5 w-5" style={{ color: 'var(--text)' }} />
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  New Project
                </span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={toggleMenu}
          className="h-12 w-12 rounded-full flex items-center justify-center transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: isOpen ? 'var(--systemTertiary)' : 'var(--keyColor)',
            boxShadow: 'var(--shadow-lg)',
          }}
          title={isOpen ? 'Close menu' : 'Add new'}
        >
          {isOpen ? (
            <X className="h-5 w-5" style={{ color: 'white' }} />
          ) : (
            <Plus className="h-6 w-6" style={{ color: 'white' }} />
          )}
        </button>
      </div>

      {showProjectModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setShowProjectModal(false)}
          >
            <div
              className="glass-elevated rounded-apple-xl p-6 w-[500px] max-w-[90vw] animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
              style={{
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              }}
            >
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                Create New Project
              </h2>
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Cover Art (Optional)
                  </label>
                  <div
                    className="w-64 h-64 mx-auto rounded-apple flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '2px dashed var(--accent)',
                    }}
                    onClick={handleCoverArtSelect}
                  >
                    {projectCoverArt ? (
                      <img
                        src={projectCoverArt}
                        alt="Cover art preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl mb-2">🖼️</div>
                        <p style={{ color: 'var(--text-secondary)' }}>Click to upload cover art</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          1:1 ratio recommended
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="w-full px-4 py-2 rounded-apple"
                    style={{
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--accent)',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateProject()
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Description
                  </label>
                  <textarea
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Enter project description (optional)"
                    rows={3}
                    className="w-full px-4 py-2 rounded-apple resize-none"
                    style={{
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--accent)',
                    }}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowProjectModal(false)
                      setProjectName('')
                      setProjectDesc('')
                      setProjectCoverArt('')
                    }}
                    className="flex-1 px-4 py-2 rounded-apple font-medium hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProject}
                    className="flex-1 px-4 py-2 rounded-apple font-medium hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showCropModal &&
        tempImageForCrop &&
        createPortal(
          <div className="fixed inset-0 z-[10000]">
            <ImageCropModal
              imageSrc={tempImageForCrop}
              onCropComplete={handleCropComplete}
              onClose={() => {
                setShowCropModal(false)
                setTempImageForCrop('')
              }}
            />
          </div>,
          document.body
        )}
    </>
  )
}
