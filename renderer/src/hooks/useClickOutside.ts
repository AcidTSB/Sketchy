import { useEffect, RefObject } from 'react'

type Event = MouseEvent | TouchEvent

/**
 * Hook để theo dõi cú click chuột bên ngoài một element cụ thể.
 * @param ref Ref của element cần theo dõi.
 * @param handler Hàm callback sẽ được gọi khi click ra bên ngoài.
 */
export function useClickOutside<T extends HTMLElement>( // <-- PHẢI CÓ "export" ở đây
  ref: RefObject<T>,
  handler: (event: Event) => void
) {
  useEffect(() => {
    const listener = (event: Event) => {
      // Không làm gì nếu click vào chính element (hoặc con của nó)
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    // Dọn dẹp listener khi component unmount
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}
