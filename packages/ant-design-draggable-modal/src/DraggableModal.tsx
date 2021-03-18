import * as React from 'react'
import { FunctionComponent, ReactElement, useContext } from 'react'
import { useUID } from 'react-uid'
import { DraggableModalContext } from './DraggableModalContext'
import { DraggableModalInner } from './DraggableModalInner'
import { getModalState } from './draggableModalReducer'
import { ModalProps } from 'antd/lib/modal'
import { getWindowSize } from './getWindowSize'

export interface DraggableModalProps extends ModalProps {
    initialWidth?: number
    initialHeight?: number
    initialX?: number
    initialY?: number
    resizable?: boolean
    // TODO: rename to min/max borders
    minPosition?: {x?: number, y?: number}
    maxPosition?: {x?: number, y?: number}
}

export const DraggableModal: FunctionComponent<DraggableModalProps> = (
    props: DraggableModalProps,
): ReactElement => {
    // Get the unique ID of this modal.
    const id = useUID()

    // Get modal provider.
    const modalProvider = useContext(DraggableModalContext)
    if (!modalProvider) {
        throw new Error('No Provider')
    }

    const initialWidth = props.initialWidth || props.width as number
    const { dispatch, state } = modalProvider
    const modalState = getModalState({
        state,
        id,
        initialHeight: props.initialHeight,
        initialWidth,
        initialX: props.initialX,
        initialY: props.initialY,
        minPosition: props.minPosition,
        maxPosition: props.maxPosition,
    })

    if (props.resizable && (!props.initialHeight || !props.initialWidth)) {
      console.warn('Provide initialHeight and initialWidth or set resizable to false.')
    }

    const { maxPosition } = props
    React.useEffect(() => {
      const value = {
        x: null, 
        y: null,
        ...maxPosition
      }
      dispatch({type: 'updateMaxPosition', id, value})
    }, [maxPosition, dispatch])

    const { minPosition } = props
    React.useEffect(() => {
      const value = {
        x: null, 
        y: null,
        ...minPosition
      }
      dispatch({type: 'updateMinPosition', id, value})
    }, [minPosition, dispatch])

    // We do this so that we don't re-render all modals for every state change.
    // DraggableModalInner uses React.memo, so it only re-renders if
    // if props change (e.g. modalState).
    return <DraggableModalInner id={id} dispatch={dispatch} modalState={modalState} {...props} initialWidth={initialWidth} />
}
