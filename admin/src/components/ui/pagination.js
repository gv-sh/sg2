import * as React from "react"
import { cn } from "../../lib/utils"
import { Button, Select, Input } from "./form-controls"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react'

const Pagination = React.forwardRef(({ 
  className, 
  currentPage, 
  totalPages, 
  onPageChange,
  ...props 
}, ref) => {
  return (
    <nav
      ref={ref}
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
})
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef(({ 
  className, 
  ...props 
}, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef(({ 
  className, 
  ...props 
}, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

const PaginationLink = React.forwardRef(({ 
  className, 
  isActive, 
  size = "default",
  ...props 
}, ref) => (
  <Button
    ref={ref}
    variant={isActive ? "default" : "ghost"}
    size={size}
    className={cn(
      "h-9 w-9 p-0",
      className
    )}
    {...props}
  />
))
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = React.forwardRef(({ 
  className, 
  ...props 
}, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
))
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = React.forwardRef(({ 
  className, 
  ...props 
}, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
))
PaginationNext.displayName = "PaginationNext"

const PaginationFirst = React.forwardRef(({ 
  className, 
  ...props 
}, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to first page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronsLeft className="h-4 w-4" />
    <span>First</span>
  </PaginationLink>
))
PaginationFirst.displayName = "PaginationFirst"

const PaginationLast = React.forwardRef(({ 
  className, 
  ...props 
}, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to last page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Last</span>
    <ChevronsRight className="h-4 w-4" />
  </PaginationLink>
))
PaginationLast.displayName = "PaginationLast"

const PaginationEllipsis = React.forwardRef(({ 
  className, 
  ...props 
}, ref) => (
  <span
    ref={ref}
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
))
PaginationEllipsis.displayName = "PaginationEllipsis"

// Complete pagination component with all controls
const PaginationControls = React.forwardRef(({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 20,
  onPageChange,
  onItemsPerPageChange,
  showPageSizeSelector = true,
  showFirstLast = true,
  showPageNumbers = true,
  maxVisiblePages = 5,
  className,
  ...props
}, ref) => {
  const [goToPage, setGoToPage] = React.useState("")

  // Calculate visible page numbers
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const half = Math.floor(maxVisiblePages / 2)
    let start = Math.max(currentPage - half, 1)
    let end = Math.min(start + maxVisiblePages - 1, totalPages)

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(end - maxVisiblePages + 1, 1)
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const handleGoToPage = (e) => {
    e.preventDefault()
    const pageNum = parseInt(goToPage, 10)
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum)
      setGoToPage("")
    }
  }

  const visiblePages = getVisiblePages()
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div 
      ref={ref}
      className={cn("flex flex-col space-y-4", className)}
      {...props}
    >
      {/* Page info and controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Items info */}
        <div className="text-sm text-muted-foreground">
          Showing {totalItems > 0 ? startItem : 0} to {endItem} of {totalItems} items
        </div>

        {/* Page size selector and go to page */}
        <div className="flex items-center gap-4">
          {showPageSizeSelector && onItemsPerPageChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <Select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(parseInt(e.target.value, 10))}
                className="w-20"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
            </div>
          )}

          {totalPages > 1 && (
            <form onSubmit={handleGoToPage} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Go to page:</span>
              <Input
                type="number"
                min="1"
                max={totalPages}
                value={goToPage}
                onChange={(e) => setGoToPage(e.target.value)}
                className="w-16 h-8"
                placeholder={currentPage}
              />
              <Button type="submit" size="sm" variant="outline" className="h-8">
                Go
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Pagination navigation */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {/* First page */}
            {showFirstLast && currentPage > 1 && (
              <PaginationItem>
                <PaginationFirst onClick={() => onPageChange(1)} />
              </PaginationItem>
            )}

            {/* Previous page */}
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              />
            </PaginationItem>

            {/* Page numbers */}
            {showPageNumbers && (
              <>
                {visiblePages[0] > 1 && (
                  <>
                    <PaginationItem>
                      <PaginationLink onClick={() => onPageChange(1)}>
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {visiblePages[0] > 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

                {visiblePages.map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => onPageChange(page)}
                      isActive={page === currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {visiblePages[visiblePages.length - 1] < totalPages && (
                  <>
                    {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink onClick={() => onPageChange(totalPages)}>
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
              </>
            )}

            {/* Next page */}
            <PaginationItem>
              <PaginationNext 
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>

            {/* Last page */}
            {showFirstLast && currentPage < totalPages && (
              <PaginationItem>
                <PaginationLast onClick={() => onPageChange(totalPages)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
})
PaginationControls.displayName = "PaginationControls"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationFirst,
  PaginationLast,
  PaginationControls,
}