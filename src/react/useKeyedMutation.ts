import React from 'react'

import { useConfigContext } from './ReactQueryConfigProvider'
import { useGetLatest, useMountedCallback } from './utils'
import { Console, uid, getStatusProps } from '../core/utils'
import {
  QueryStatus,
  MutationFunction,
  MutationConfig,
  MutateConfig, KeyedMutationResultPair,
} from '../core/types'

// TYPES

type Reducer<S, A> = (prevState: S, action: A) => S

interface KeyedState<TResult, TError> {
  status: QueryStatus
  data: TResult | undefined
  error: TError | null
  isIdle: boolean
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
}

interface State<TResult, TError> {
  keyed: {[key: string]: KeyedState<TResult, TError>}
}

enum ActionType {
  Reset = 'Reset',
  Loading = 'Loading',
  Resolve = 'Resolve',
  Reject = 'Reject',
}

interface ResetAction {
  type: ActionType.Reset
  _key?: string
}

interface LoadingAction {
  type: ActionType.Loading
  _key: string
}

interface ResolveAction<TResult> {
  type: ActionType.Resolve
  data: TResult
  _key: string
}

interface RejectAction<TError> {
  type: ActionType.Reject
  error: TError
  _key: string
}

type Action<TResult, TError> =
  | ResetAction
  | LoadingAction
  | ResolveAction<TResult>
  | RejectAction<TError>

// HOOK

// const getDefaultState = (): KeyedState<any, any> => ({
//   ...getStatusProps(QueryStatus.Idle),
//   data: undefined,
//   error: null,
// })

const getDefaultState2 = (): State<any, any> => ({
  keyed: {}
})

function mutationReducer<TResult, TError>(
  state: State<TResult, TError>,
  action: Action<TResult, TError>
): State<TResult, TError> {
  switch (action.type) {
    case ActionType.Reset:
      if (action._key) {
        const newState = {...state.keyed}
        delete newState[action._key]
        return {
          keyed: newState
        }
      } else {
        return {keyed: {}}
      }
    case ActionType.Loading:
      return {
        keyed: {
          ...state.keyed,
          [action._key]: {
            ...getStatusProps(QueryStatus.Loading),
            data: undefined,
            error: null,
          }
        }
      }
    case ActionType.Resolve:
      return {
        keyed: {
          ...state.keyed,
          [action._key]: {
            ...getStatusProps(QueryStatus.Success),
            data: action.data,
            error: null,
          }
        }
      }
    case ActionType.Reject:
      return {
        keyed: {
          ...state.keyed,
          [action._key]: {
            ...getStatusProps(QueryStatus.Error),
            data: undefined,
            error: action.error,
          }
        }
      }
    default:
      return state
  }
}

interface IVariables {
  _key?: string
}

export function useKeyedMutation<
  TResult,
  TError = unknown,
  TVariables extends IVariables | undefined = undefined,
  TSnapshot = unknown
>(
  mutationFn: MutationFunction<TResult, TVariables>,
  config: MutationConfig<TResult, TError, TVariables, TSnapshot> = {}
): KeyedMutationResultPair<TResult, TError, TVariables, TSnapshot> {
  const [state, unsafeDispatch] = React.useReducer(
    mutationReducer as Reducer<State<TResult, TError>, Action<TResult, TError>>,
    null,
    getDefaultState2
  )

  const dispatch = useMountedCallback(unsafeDispatch)

  const getMutationFn = useGetLatest(mutationFn)

  const contextConfig = useConfigContext()

  const getConfig = useGetLatest({
    ...contextConfig.shared,
    ...contextConfig.mutations,
    ...config,
  })

  const latestMutationRef = React.useRef<number>()

  const mutate = React.useCallback(
    async (
      variables?: TVariables,
      mutateConfig: MutateConfig<TResult, TError, TVariables, TSnapshot> = {}
    ): Promise<TResult | undefined> => {
      if (!variables) {
        console.error('keyed mutations require variables')
        return
      }
      const config = getConfig()

      const mutationId = uid()
      latestMutationRef.current = mutationId

      const isLatest = () => latestMutationRef.current === mutationId

      let snapshotValue: TSnapshot | undefined

      try {
        const loadingAction = { type: ActionType.Loading } as any
        if (variables && variables._key !== undefined) {
          loadingAction._key = variables._key
        }
        dispatch(loadingAction)

        snapshotValue = (await config.onMutate?.(variables!)) as TSnapshot

        const data = await getMutationFn()(variables!)

        if (isLatest()) {
          const resolveAction = { type: ActionType.Resolve, data } as any
          if (variables && variables._key) {
            resolveAction._key = variables._key
          }
          dispatch(resolveAction)
        }

        await config.onSuccess?.(data, variables!)
        await mutateConfig.onSuccess?.(data, variables!)
        await config.onSettled?.(data, null, variables!)
        await mutateConfig.onSettled?.(data, null, variables!)

        return data
      } catch (error) {
        Console.error(error)
        await config.onError?.(error, variables!, snapshotValue!)
        await mutateConfig.onError?.(error, variables!, snapshotValue!)
        await config.onSettled?.(
          undefined,
          error,
          variables!,
          snapshotValue as TSnapshot
        )
        await mutateConfig.onSettled?.(
          undefined,
          error,
          variables!,
          snapshotValue
        )

        if (isLatest()) {
          const rejectAction = { type: ActionType.Reject, error } as any
          if (variables && variables._key !== undefined) {
            rejectAction._key = variables._key
          }
          dispatch(rejectAction)
        }

        if (mutateConfig.throwOnError ?? config.throwOnError) {
          throw error
        }

        return
      }
    },
    [dispatch, getConfig, getMutationFn]
  )

  const reset = React.useCallback((_key?: string) => {
    const resetAction = { type: ActionType.Reset } as any
    if (_key !== undefined) {
      resetAction._key = _key
    }
    dispatch(resetAction)
  }, [dispatch])

  // ignore using this for now - @jaredpetker
  // React.useEffect(() => {
  //   const { suspense, useErrorBoundary } = getConfig()
  //
  //   if ((useErrorBoundary ?? suspense) && state.error) {
  //     throw state.error
  //   }
  // }, [getConfig, state.error])

  return [mutate, { ...state, reset }]
}
