import * as React from 'react'
import { clsx } from 'clsx'

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="bmr-table-container">
      <table ref={ref} className={clsx('bmr-table', className)} {...props} />
    </div>
  ),
)
Table.displayName = 'Table'

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={clsx('bmr-table__header', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={clsx('bmr-table__body', className)} {...props} />
))
TableBody.displayName = 'TableBody'

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={clsx('bmr-table__footer', className)} {...props} />
))
TableFooter.displayName = 'TableFooter'

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected = false, ...props }, ref) => (
    <tr
      ref={ref}
      data-state={selected ? 'selected' : undefined}
      className={clsx('bmr-table__row', selected && 'bmr-table__row--selected', className)}
      {...props}
    />
  ),
)
TableRow.displayName = 'TableRow'

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, numeric = false, ...props }, ref) => (
    <th
      ref={ref}
      className={clsx('bmr-table__head', numeric && 'bmr-table__head--numeric', className)}
      {...props}
    />
  ),
)
TableHead.displayName = 'TableHead'

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, numeric = false, ...props }, ref) => (
    <td
      ref={ref}
      className={clsx('bmr-table__cell', numeric && 'bmr-table__cell--numeric', className)}
      {...props}
    />
  ),
)
TableCell.displayName = 'TableCell'

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={clsx('bmr-table__caption', className)} {...props} />
))
TableCaption.displayName = 'TableCaption'
