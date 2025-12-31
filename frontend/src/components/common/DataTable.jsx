import React from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const DataTable = ({
  columns,
  data,
  loading = false,
  pagination = null,
  onPageChange = null,
  searchValue = '',
  onSearchChange = null,
  emptyMessage = 'No records found',
  actions = null,
}) => {
  return (
    <div className="data-table-container">
      {/* Search & Actions Bar */}
      {(onSearchChange || actions) && (
        <div className="table-toolbar">
          {onSearchChange && (
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
          {actions && <div className="table-actions">{actions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={{ width: col.width || 'auto' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="table-loading">
                  <div className="loader-small"></div>
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={row.id || rowIndex}>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="table-pagination">
          <span className="pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total}
          </span>
          <div className="pagination-buttons">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="page-number">{pagination.page}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
