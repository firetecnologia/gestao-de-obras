import { useState, useEffect, useCallback } from "react"
import { AxiosResponse } from "axios"

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export function usePaginatedList<T>(
  fetchFn: (params: Record<string, unknown>) => Promise<AxiosResponse<PaginatedResponse<T>>>,
  initialParams: Record<string, unknown> = {}
) {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState(initialParams)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchFn({ ...params, page })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, params, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { items, total, page, setPage, loading, params, setParams, refetch: fetchData }
}
