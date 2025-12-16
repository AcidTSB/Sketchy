import { useState, useRef, useCallback } from 'react'
import { X, Check } from 'lucide-react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropModalProps {
  imageSrc: string
  onCropComplete: (croppedImage: string) => void
  onClose: () => void
}

export default function ImageCropModal({ imageSrc, onCropComplete, onClose }: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const size = Math.min(width, height)
    const x = (width - size) / 2
    const y = (height - size) / 2

    setCrop({
      unit: 'px',
      width: size,
      height: size,
      x,
      y,
    })
  }, [])

  const handleCropComplete = useCallback(() => {
    if (!completedCrop || !imgRef.current) return

    const image = imgRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = completedCrop.width
    canvas.height = completedCrop.height

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    )

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const reader = new FileReader()
        reader.onloadend = () => {
          onCropComplete(reader.result as string)
        }
        reader.readAsDataURL(blob)
      },
      'image/jpeg',
      0.95
    )
  }, [completedCrop, onCropComplete])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
    >
      <div
        className="glass-elevated rounded-apple-xl p-6 w-[600px] max-w-[90vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Crop Cover Art (1:1)
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-apple hover:opacity-80 transition-smooth"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <X size={20} style={{ color: 'var(--text)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-auto mb-4 flex items-center justify-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop={false}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxWidth: '100%', maxHeight: '60vh' }}
            />
          </ReactCrop>
        </div>

        <div className="text-sm mb-4 text-center" style={{ color: 'var(--text-secondary)' }}>
          Drag to adjust the crop area. The image will be cropped to a 1:1 square ratio.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-apple hover:opacity-80 transition-smooth"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCropComplete}
            disabled={!completedCrop}
            className="flex-1 px-4 py-2 rounded-apple hover:opacity-90 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--primary)', color: 'white' }}
          >
            <Check size={18} />
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  )
}
