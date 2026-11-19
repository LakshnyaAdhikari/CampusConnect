const errorDetails = error => ({
  code: error?.code || 'unknown',
  message: error?.message || String(error),
})

export const settleMetricLoader = async loader => {
  try {
    const value = await loader()
    return value?.status === 'unavailable'
      ? value
      : { status: 'success', value }
  } catch (error) {
    return { status: 'error', ...errorDetails(error) }
  }
}

export const settleMetricLoaders = async (loaders, onMetricSettled) => {
  const entries = Object.entries(loaders)
  const settledEntries = await Promise.all(entries.map(async ([key, loader]) => {
    const result = { ...(await settleMetricLoader(loader)), metric: key }
    onMetricSettled?.(key, result)
    return [key, result]
  }))
  return Object.fromEntries(settledEntries)
}

export const retryMetricLoader = async (loaders, key) => {
  if (typeof loaders[key] !== 'function') throw new Error(`Unknown Overview metric: ${key}`)
  return [key, { ...(await settleMetricLoader(loaders[key])), metric: key }]
}

export const sumMetricResults = (first, second) => {
  const failedMetrics = [first, second]
    .filter(result => result.status === 'error')
    .map(result => result.metric)
    .filter(Boolean)

  if (first.status === 'error' || second.status === 'error') {
    const failed = first.status === 'error' ? first : second
    return { status: 'error', ...failed, failedMetrics }
  }
  if (first.status === 'unavailable' || second.status === 'unavailable') {
    const unavailable = first.status === 'unavailable' ? first : second
    return { ...unavailable, failedMetrics }
  }
  return { status: 'success', value: first.value + second.value }
}

export const unavailableMetric = reason => ({ status: 'unavailable', reason })
