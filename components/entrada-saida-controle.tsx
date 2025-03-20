"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { ArrowDownCircle, ArrowUpCircle, FileDown, MoreHorizontal, Plus, Search, Trash2, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { PrintLayout } from "@/components/print-layout"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/format"
import type { Transacao } from "@/types/schema"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { exportTransacoesExcel } from "@/lib/excel-export"

type EntradaSaidaControleProps = {
  transacoesIniciais: Transacao[]
  setTransacoes: (transacoes: Transacao[]) => void
  isAdminMode: boolean
}

export function EntradaSaidaControle({ transacoesIniciais, setTransacoes, isAdminMode }: EntradaSaidaControleProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [mesFiltro, setMesFiltro] = useState<string>("")
  const [anoFiltro, setAnoFiltro] = useState<string>(new Date().getFullYear().toString())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [transacaoToDelete, setTransacaoToDelete] = useState<string | null>(null)
  const [newTransacao, setNewTransacao] = useState<Partial<Transacao>>({
    tipo: "entrada",
    data: new Date(),
  })

  // Gerar anos para o filtro (últimos 5 anos)
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => (anoAtual - i).toString())
  }, [])

  // Filtrar transações por mês, ano e termo de busca
  const transacoesFiltradas = useMemo(() => {
    return transacoesIniciais.filter((transacao) => {
      const dataTransacao = new Date(transacao.data)
      const mesMatch = mesFiltro ? dataTransacao.getMonth() + 1 === Number.parseInt(mesFiltro) : true
      const anoMatch = anoFiltro ? dataTransacao.getFullYear() === Number.parseInt(anoFiltro) : true
      const searchMatch = searchTerm
        ? transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transacao.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transacao.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
        : true

      return mesMatch && anoMatch && searchMatch
    })
  }, [transacoesIniciais, mesFiltro, anoFiltro, searchTerm])

  // Calcular totais
  const totais = useMemo(() => {
    const totalEntradas = transacoesFiltradas.filter((t) => t.tipo === "entrada").reduce((sum, t) => sum + t.valor, 0)

    const totalSaidas = transacoesFiltradas.filter((t) => t.tipo === "saida").reduce((sum, t) => sum + t.valor, 0)

    return {
      entradas: totalEntradas,
      saidas: totalSaidas,
      saldo: totalEntradas - totalSaidas,
    }
  }, [transacoesFiltradas])

  const handleAddTransacao = () => {
    if (
      newTransacao.data &&
      newTransacao.tipo &&
      newTransacao.valor &&
      newTransacao.descricao &&
      newTransacao.categoria &&
      newTransacao.responsavel
    ) {
      const transacaoToAdd: Transacao = {
        id: Date.now().toString(),
        data: newTransacao.data,
        tipo: newTransacao.tipo as "entrada" | "saida",
        valor: Number(newTransacao.valor),
        descricao: newTransacao.descricao,
        categoria: newTransacao.categoria,
        responsavel: newTransacao.responsavel,
        observacoes: newTransacao.observacoes || "",
      }

      setTransacoes([...transacoesIniciais, transacaoToAdd])
      setIsAddDialogOpen(false)
      setNewTransacao({
        tipo: "entrada",
        data: new Date(),
      })

      toast({
        title: "Transação adicionada",
        description: "A nova transação foi adicionada com sucesso.",
      })
    } else {
      toast({
        title: "Erro ao adicionar",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
    }
  }

  const handleConfirmDelete = () => {
    if (transacaoToDelete) {
      setTransacoes(transacoesIniciais.filter((t) => t.id !== transacaoToDelete))
      setIsDeleteDialogOpen(false)
      setTransacaoToDelete(null)

      toast({
        title: "Transação eliminada",
        description: "A transação foi removida com sucesso.",
      })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    // Exportar usando a nova função formatada
    const fileName = exportTransacoesExcel(transacoesFiltradas, {
      mes: mesFiltro || undefined,
      ano: anoFiltro || undefined,
    })

    toast({
      title: "Excel exportado",
      description: `O relatório foi exportado como ${fileName}.`,
    })
  }

  const handleExportPDF = () => {
    // Criar novo documento PDF
    const doc = new jsPDF()

    // Adicionar título
    doc.setFontSize(18)
    doc.text("Relatório de Transações", 14, 22)

    // Adicionar período
    doc.setFontSize(12)
    const periodoTexto = `Período: ${mesFiltro ? `Mês ${mesFiltro}` : "Todos os meses"} de ${anoFiltro || new Date().getFullYear()}`
    doc.text(periodoTexto, 14, 32)

    // Preparar dados para a tabela
    const tableData = transacoesFiltradas.map((t) => [
      format(new Date(t.data), "dd/MM/yyyy"),
      t.tipo === "entrada" ? "Entrada" : "Saída",
      formatCurrency(t.valor),
      t.descricao,
      t.categoria,
      t.responsavel,
    ])

    // Adicionar tabela
    doc.autoTable({
      startY: 40,
      head: [["Data", "Tipo", "Valor", "Descrição", "Categoria", "Responsável"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      footStyles: { fillColor: [41, 128, 185], textColor: 255 },
      foot: [
        ["", "Total Entradas", formatCurrency(totais.entradas), "", "", ""],
        ["", "Total Saídas", formatCurrency(totais.saidas), "", "", ""],
        ["", "Saldo", formatCurrency(totais.saldo), "", "", ""],
      ],
    })

    // Salvar o PDF
    const fileName = `Transacoes_${mesFiltro || "Todos"}_${anoFiltro || new Date().getFullYear()}.pdf`
    doc.save(fileName)

    toast({
      title: "PDF exportado",
      description: "O relatório foi exportado em formato PDF.",
    })
  }

  const getNomeMes = (numeroMes: string) => {
    const meses = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ]
    return meses[Number.parseInt(numeroMes) - 1]
  }

  return (
    <PrintLayout title="Controle de Entrada/Saída">
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
          <Card className="bg-green-50 dark:bg-green-900 shadow-sm">
            <CardHeader className="pb-1 pt-2 px-3">
              <CardTitle className="text-green-700 dark:text-green-300 text-sm md:text-lg">Total de Entradas</CardTitle>
            </CardHeader>
            <CardContent className="pb-2 px-3">
              <div className="text-lg md:text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(totais.entradas)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-900 shadow-sm">
            <CardHeader className="pb-1 pt-2 px-3">
              <CardTitle className="text-red-700 dark:text-red-300 text-sm md:text-lg">Total de Saídas</CardTitle>
            </CardHeader>
            <CardContent className="pb-2 px-3">
              <div className="text-lg md:text-2xl font-bold text-red-700 dark:text-red-300">
                {formatCurrency(totais.saidas)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900 shadow-sm">
            <CardHeader className="pb-1 pt-2 px-3">
              <CardTitle className="text-blue-700 dark:text-blue-300 text-sm md:text-lg">Saldo Atual</CardTitle>
            </CardHeader>
            <CardContent className="pb-2 px-3">
              <div className="text-lg md:text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(totais.saldo)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e ações */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar transações..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={mesFiltro} onValueChange={setMesFiltro}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                  <SelectItem key={mes} value={mes.toString()}>
                    {getNomeMes(mes.toString())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={anoFiltro} onValueChange={setAnoFiltro}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                {anos.map((ano) => (
                  <SelectItem key={ano} value={ano}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Transação</DialogTitle>
                  <DialogDescription>Preencha os detalhes da transação a ser adicionada ao sistema.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select
                        value={newTransacao.tipo}
                        onValueChange={(value) =>
                          setNewTransacao({ ...newTransacao, tipo: value as "entrada" | "saida" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="saida">Saída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="data">Data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            {newTransacao.data ? (
                              format(newTransacao.data, "dd/MM/yyyy", { locale: pt })
                            ) : (
                              <span>Selecionar data</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newTransacao.data}
                            onSelect={(date) => setNewTransacao({ ...newTransacao, data: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="valor">Valor (R$)</Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newTransacao.valor || ""}
                        onChange={(e) => setNewTransacao({ ...newTransacao, valor: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="categoria">Categoria</Label>
                      <Input
                        id="categoria"
                        placeholder="Ex: Dízimos, Ofertas, Aluguel..."
                        value={newTransacao.categoria || ""}
                        onChange={(e) => setNewTransacao({ ...newTransacao, categoria: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input
                      id="descricao"
                      placeholder="Descrição da transação"
                      value={newTransacao.descricao || ""}
                      onChange={(e) => setNewTransacao({ ...newTransacao, descricao: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="responsavel">Responsável</Label>
                    <Input
                      id="responsavel"
                      placeholder="Nome do responsável"
                      value={newTransacao.responsavel || ""}
                      onChange={(e) => setNewTransacao({ ...newTransacao, responsavel: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="observacoes">Observações (opcional)</Label>
                    <Input
                      id="observacoes"
                      placeholder="Observações adicionais"
                      value={newTransacao.observacoes || ""}
                      onChange={(e) => setNewTransacao({ ...newTransacao, observacoes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddTransacao}>Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={handleExportExcel} className="print:hidden">
              <FileDown className="mr-2 h-4 w-4" />
              Excel
            </Button>

            <Button onClick={handleExportPDF} className="print:hidden">
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>

            <Button onClick={handlePrint} className="print:hidden">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Tabela de transações - versão desktop */}
        <div className="rounded-md border overflow-x-auto hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoesFiltradas.length > 0 ? (
                transacoesFiltradas.map((transacao) => (
                  <TableRow key={transacao.id}>
                    <TableCell>{format(new Date(transacao.data), "dd/MM/yyyy", { locale: pt })}</TableCell>
                    <TableCell>
                      {transacao.tipo === "entrada" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800 flex items-center gap-1"
                        >
                          <ArrowUpCircle className="h-3 w-3" />
                          Entrada
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800 flex items-center gap-1"
                        >
                          <ArrowDownCircle className="h-3 w-3" />
                          Saída
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          transacao.tipo === "entrada"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {formatCurrency(transacao.valor)}
                      </span>
                    </TableCell>
                    <TableCell>{transacao.descricao}</TableCell>
                    <TableCell>{transacao.categoria}</TableCell>
                    <TableCell>{transacao.responsavel}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              toast({
                                title: "Detalhes da transação",
                                description: transacao.observacoes || "Sem observações adicionais",
                              })
                            }}
                          >
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={() => {
                              setTransacaoToDelete(transacao.id)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhuma transação encontrada para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Lista de transações - versão mobile */}
        <div className="md:hidden space-y-3 mt-4">
          {transacoesFiltradas.length > 0 ? (
            transacoesFiltradas.map((transacao) => (
              <Card key={transacao.id} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{transacao.descricao}</div>
                      <div className="text-sm text-muted-foreground">{transacao.categoria}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className={
                          transacao.tipo === "entrada"
                            ? "text-green-600 dark:text-green-400 font-bold"
                            : "text-red-600 dark:text-red-400 font-bold"
                        }
                      >
                        {formatCurrency(transacao.valor)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transacao.data), "dd/MM/yyyy", { locale: pt })}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      {transacao.tipo === "entrada" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800 flex items-center gap-1"
                        >
                          <ArrowUpCircle className="h-3 w-3" />
                          Entrada
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800 flex items-center gap-1"
                        >
                          <ArrowDownCircle className="h-3 w-3" />
                          Saída
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Detalhes da transação",
                            description: transacao.observacoes || "Sem observações adicionais",
                          })
                        }}
                      >
                        Detalhes
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setTransacaoToDelete(transacao.id)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma transação encontrada para o período selecionado.
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de confirmação para exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PrintLayout>
  )
}

