"use client"

import { Dispatch, RefObject, SetStateAction, useEffect } from "react"

function useOutsideClick(
  openState: boolean,
  onClickEvent: Dispatch<SetStateAction<boolean>>,
  ref: RefObject<HTMLElement | null>,
  isEnable = true,
) {
  useEffect(() => {
    if (onClickEvent && isEnable) {
      const clickOutside = (e: MouseEvent | TouchEvent) => {
        e.stopPropagation()
        const target = e.target as Node | null
        // Ignore clicks on a trigger that toggles this panel, otherwise it would
        // close here and reopen on its own onClick (flicker). Opt-in via
        // [data-ignore-outside-click] on the trigger element.
        const onTrigger =
          target instanceof Element &&
          target.closest("[data-ignore-outside-click]") !== null
        if (
          openState &&
          ref.current &&
          !ref.current.contains(target) &&
          !onTrigger
        ) {
          onClickEvent(false)
        }
      }
      document.addEventListener("mousedown", clickOutside)
      document.addEventListener("touchstart", clickOutside)
      return () => {
        // Cleanup the event listener
        document.removeEventListener("mousedown", clickOutside)
        document.removeEventListener("touchstart", clickOutside)
      }
    }
  }, [openState, ref, onClickEvent, isEnable])
}

export default useOutsideClick
