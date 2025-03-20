import type { ReactNode } from "react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"

type PrintLayoutProps = {
  children: ReactNode
  title: string
}

export function PrintLayout({ children, title }: PrintLayoutProps) {
  return (
    <div className="print:p-4">
      <div className="print:block hidden">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <p className="text-sm mb-4">Gerado em: {format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })}</p>
      </div>
      {children}
      <div className="print:block hidden mt-4 text-sm text-gray-500">
        <p>ADAG Amor Genuíno - Sistema de Tesouraria © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}

