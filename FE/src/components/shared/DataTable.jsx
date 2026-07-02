import { FaEye, FaEdit, FaTrash } from 'react-icons/fa'

const DataTable = ({
  columns = [],
  data = [],
  onView,
  onEdit,
  onDelete,
  actions = [],
  emptyMessage = 'Không có dữ liệu',
  rowClassName,
  loading = false
}) => {
  const hasActions = actions.length > 0

  const handleAction = (action, row, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    switch (action) {
      case 'view':
        if (onView) onView(row)
        break
      case 'edit':
        if (onEdit) onEdit(row)
        break
      case 'delete':
        if (onDelete) onDelete(row)
        break
      default:
        break
    }
  }

  const renderActionButton = (action, row) => {
    const configs = {
      view: {
        icon: FaEye,
        className: 'text-blue-600 hover:text-blue-900',
        title: 'Xem chi tiết',
        onClick: onView
      },
      edit: {
        icon: FaEdit,
        className: 'text-indigo-600 hover:text-indigo-900',
        title: 'Chỉnh sửa',
        onClick: onEdit
      },
      delete: {
        icon: FaTrash,
        className: 'text-red-600 hover:text-red-900',
        title: 'Xóa',
        onClick: onDelete
      }
    }

    const config = configs[action]
    if (!config || !config.onClick) return null

    const Icon = config.icon

    return (
      <button
        key={action}
        onClick={(e) => handleAction(action, row, e)}
        className={config.className}
        title={config.title}
      >
        <Icon />
      </button>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.align === 'right' ? 'text-right' :
                    column.align === 'center' ? 'text-center' :
                    'text-left'
                  } ${column.headerClassName || ''}`}
                >
                  {column.label}
                </th>
              ))}
              {hasActions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="px-6 py-12 text-center"
                >
                  <p className="text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const customRowClass = typeof rowClassName === 'function'
                  ? rowClassName(row, rowIndex)
                  : rowClassName || ''

                return (
                  <tr
                    key={row.id || rowIndex}
                    className={`hover:bg-gray-50 ${customRowClass}`}
                  >
                    {columns.map((column, colIndex) => {
                      const cellContent = column.render
                        ? column.render(row, rowIndex)
                        : column.field
                          ? row[column.field]
                          : ''

                      return (
                        <td
                          key={colIndex}
                          className={`px-6 py-4 ${
                            column.nowrap !== false ? 'whitespace-nowrap' : ''
                          } ${column.cellClassName || ''}`}
                        >
                          {column.wrapper ? (
                            column.wrapper(cellContent, row, rowIndex)
                          ) : (
                            cellContent
                          )}
                        </td>
                      )
                    })}
                    {hasActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {actions.map(action => renderActionButton(action, row))}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
