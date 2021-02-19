import { getWindowSize } from './getWindowSize'
import { clamp } from './clamp'

const mapObject = <T>(o: { [key: string]: T }, f: (value: T) => T): { [key: string]: T } =>
    Object.assign({}, ...Object.keys(o).map((k) => ({ [k]: f(o[k]) })))

// ID for a specific modal.
export type ModalID = string

// State for a specific modal.
export interface ModalState {
    x: number
    y: number
    width: number | undefined
    height: number | undefined
    zIndex: number
    visible: boolean
    minPosition: {x: number | null, y: number | null}
    maxPosition: {x: number | null, y: number | null}
}

// State of all modals.
export interface ModalsState {
    maxZIndex: number
    windowSize: {
        width: number
        height: number
    }
    modals: {
        [key: string]: ModalState
    }
}

export const initialModalsState: ModalsState = {
    maxZIndex: 0,
    windowSize: getWindowSize(),
    modals: {},
}

// export const initialModalState: ModalState = {
//     x: 0,
//     y: 0,
//     width: 800,
//     height: 800,
//     zIndex: 0,
//     visible: false,
//     minPosition: {x: null, y: null},
//     maxPosition: {x: null, y: null},
// }

const getInitialModalState = ({
    initialWidth,
    initialHeight,
    initialX = 0,
    initialY = 0,
}: {
    initialWidth?: number
    initialHeight?: number
    initialX?: number
    initialY?: number
}) => {
    return {
        width: initialWidth,
        height: initialHeight,
        x: initialX,
        y: initialY,
    }
}

export type Action =
    | {
          type: 'show'
          id: ModalID
          maxPosition?: { x?: number; y?: number }
          minPosition?: { x?: number; y?: number }
      }
    | { type: 'hide'; id: ModalID }
    | { type: 'focus'; id: ModalID }
    | { type: 'unmount'; id: ModalID }
    | {
          type: 'mount'
          id: ModalID
          intialState: {
              initialWidth?: number
              initialHeight?: number
              initialX?: number
              initialY?: number
          }
      }
    | { type: 'windowResize'; size: { width: number; height: number } }
    | {
          type: 'drag'
          id: ModalID
          x: number
          y: number
          maxPosition?: { x?: number; y?: number }
          minPosition?: { x?: number; y?: number }
      }
    | {
          type: 'resize'
          id: ModalID
          x: number
          y: number
          width: number
          height: number
      }
    | {
          type: 'updateMinPosition'
          id: ModalID
          value: {x: number | null, y: number | null}
    }
    | {
          type: 'updateMaxPosition'
          id: ModalID
          value: {x: number | null, y: number | null}
    }

export const getModalState = ({
    state,
    id,
    initialWidth,
    initialHeight,
    initialX,
    initialY,
}: {
    state: ModalsState
    id: ModalID
    initialWidth?: number
    initialHeight?: number
    initialX?: number
    initialY?: number
}): ModalState =>
    state.modals[id] || getInitialModalState({ initialWidth, initialHeight, initialX, initialY })

const getNextZIndex = (state: ModalsState, id: string): number =>
    getModalState({ state, id }).zIndex === state.maxZIndex ? state.maxZIndex : state.maxZIndex + 1

const clampDrag = (
    x: number,
    y: number,
    width: number,
    height: number,
    maxX: number,
    maxY: number,
    minX: number,
    minY: number,
): { x: number; y: number } => {
    const maxX_ = maxX - width
    const maxY_ = maxY - height
    const clampedX = clamp(minX, maxX_, x)
    const clampedY = clamp(minY, maxY_, y)
    const res =  { x: clampedX, y: clampedY }
    return res
}

const clampResize = (
    windowWidth: number,
    windowHeight: number,
    x: number,
    y: number,
    width: number,
    height: number,
): { width: number; height: number } => {
    const maxWidth = windowWidth - x
    const maxHeight = windowHeight - y
    const clampedWidth = clamp(200, maxWidth, width)
    const clampedHeight = clamp(200, maxHeight, height)
    return { width: clampedWidth, height: clampedHeight }
}

export const draggableModalReducer = (state: ModalsState, action: Action): ModalsState => {
    switch (action.type) {
        case 'resize':
            const size = clampResize(
                state.windowSize.width,
                state.windowSize.height,
                action.x,
                action.y,
                action.width,
                action.height,
            )
            return {
                ...state,
                maxZIndex: getNextZIndex(state, action.id),
                modals: {
                    ...state.modals,
                    [action.id]: {
                        ...state.modals[action.id],
                        ...size,
                        zIndex: getNextZIndex(state, action.id),
                    },
                },
            }
        case 'drag':
            const modal = state.modals[action.id]
            return {
                ...state,
                maxZIndex: getNextZIndex(state, action.id),
                modals: {
                    ...state.modals,
                    [action.id]: {
                        ...state.modals[action.id],
                        ...clampDrag(
                            action.x,
                            action.y,
                            state.modals[action.id].width || 0,
                            state.modals[action.id].height || 0,
                            modal.maxPosition.x ? Math.min(modal.maxPosition.x, state.windowSize.width) : state.windowSize.width,
                            modal.maxPosition.y ? Math.min(modal.maxPosition.y, state.windowSize.height) : state.windowSize.height,
                            action.minPosition?.x || 0,
                            action.minPosition?.y || 0,
                        ),
                        zIndex: getNextZIndex(state, action.id),
                    },
                },
            }
        case 'show': {
            const modalState = state.modals[action.id]
            const position = clampDrag(
                modalState.x,
                modalState.y,
                modalState.width || 0,
                modalState.height || 0,
                modalState.maxPosition.x ? Math.min(modalState.maxPosition.x, state.windowSize.width) : state.windowSize.width,
                modalState.maxPosition.y ? Math.min(modalState.maxPosition.y, state.windowSize.height) : state.windowSize.height,
                action.minPosition?.x || 0,
                action.minPosition?.y || 0,
            )
            // const size = clampResize(
            //     state.windowSize.width,
            //     state.windowSize.height,
            //     position.x,
            //     position.y,
            //     modalState.width || 0,
            //     modalState.height || 0,
            // )
            return {
                ...state,
                maxZIndex: state.maxZIndex + 1,
                modals: {
                    ...state.modals,
                    [action.id]: {
                        ...modalState,
                        ...position,
                        // ...size,
                        zIndex: state.maxZIndex + 1,
                        visible: true,
                    },
                },
            }
        }
        case 'focus':
            const modalState = state.modals[action.id]
            return {
                ...state,
                maxZIndex: state.maxZIndex + 1,
                modals: {
                    ...state.modals,
                    [action.id]: {
                        ...modalState,
                        zIndex: state.maxZIndex + 1,
                    },
                },
            }
        case 'hide': {
            const modalState = state.modals[action.id]
            return {
                ...state,
                modals: {
                    ...state.modals,
                    [action.id]: {
                        ...modalState,
                        visible: false,
                    },
                },
            }
        }
        case 'mount':
            const initialState = getInitialModalState({ ...action.intialState })
            return {
                ...state,
                maxZIndex: state.maxZIndex + 1,
                modals: {
                    ...state.modals,
                    [action.id]: {
                        ...state.modals[action.id],
                        ...initialState,
                        zIndex: state.maxZIndex + 1,
                    },
                },
            }
        case 'unmount':
            const modalsClone = { ...state.modals }
            delete modalsClone[action.id]
            return {
                ...state,
                modals: modalsClone,
            }
        case 'windowResize':
            return {
                ...state,
                windowSize: action.size,
                modals: mapObject(state.modals, (modalState: ModalState) => {
                    if (!modalState.visible) {
                        return modalState
                    }
                    const position = clampDrag(
                        modalState.x,
                        modalState.y,
                        modalState.width || 0,
                        modalState.height || 0,
                        modalState.maxPosition.x ? Math.min(modalState.x, state.windowSize.width) : state.windowSize.width,
                        modalState.maxPosition.y ? Math.min(modalState.y, state.windowSize.height) : state.windowSize.height,
                        0,
                        0
                    )
                    // const size = clampResize(
                    //     state.windowSize.width,
                    //     state.windowSize.height,
                    //     position.x,
                    //     position.y,
                    //     modalState.width || 0,
                    //     modalState.height || 0,
                    // )
                    return {
                        ...modalState,
                        ...position,
                        // ...size,
                    }
                }),
            }
        case 'updateMinPosition':
            return {
              ...state,
              modals: {
                ...state.modals,
                [action.id]: {
                  ...state.modals[action.id],
                  minPosition: {
                    ...state.modals[action.id].minPosition,
                    ...action.value
                  }
                }
              }
            }
        case 'updateMaxPosition':
            return {
              ...state,
              modals: {
                ...state.modals,
                [action.id]: {
                  ...state.modals[action.id],
                  maxPosition: {
                    ...state.modals[action.id].maxPosition,
                    ...action.value
                  }
                }
              }
            }
        default:
            throw new Error()
    }
}
