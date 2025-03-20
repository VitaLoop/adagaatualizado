"use client"

import { useState, useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Line,
  LineChart,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PrintLayout } from "@/components/print-layout"
import { Printer, FileDown, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/format"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import type { Transacao } from "@/types/schema"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

type RelatorioGeralProps = {
  transacoes: Transacao[]
}

export function RelatorioGeral({ transacoes }: RelatorioGeralProps) {
  const [anoFiltro, setAnoFiltro] = useState<string>(new Date().getFullYear().toString())
  const [mesFiltro, setMesFiltro] = useState<string>("todos")
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas")
  const [dataInicioFiltro, setDataInicioFiltro] = useState<Date | undefined>(undefined)
  const [dataFimFiltro, setDataFimFiltro] = useState<Date | undefined>(undefined)
  const [ordenacao, setOrdenacao] = useState<"valor" | "data" | "categoria">("data")
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("resumo")
  const [mostrarApenasPositivos, setMostrarApenasPositivos] = useState(false)

  // Gerar anos para o filtro (últimos 5 anos)
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => (anoAtual - i).toString())
  }, [])

  // Obter todas as categorias únicas
  const categorias = useMemo(() => {
    const categoriasSet = new Set<string>()
    transacoes.forEach((t) => categoriasSet.add(t.categoria))
    return Array.from(categoriasSet).sort()
  }, [transacoes])

  // Filtrar transações
  const transacoesFiltradas = useMemo(() => {
    return transacoes
      .filter((transacao) => {
        const dataTransacao = new Date(transacao.data)

        // Filtro por ano
        const anoMatch = anoFiltro === "todos" ? true : dataTransacao.getFullYear().toString() === anoFiltro

        // Filtro por mês
        const mesMatch = mesFiltro === "todos" ? true : dataTransacao.getMonth() + 1 === Number.parseInt(mesFiltro)

        // Filtro por categoria
        const categoriaMatch = categoriaFiltro === "todas" ? true : transacao.categoria === categoriaFiltro

        // Filtro por data de início
        const dataInicioMatch = !dataInicioFiltro ? true : dataTransacao >= dataInicioFiltro

        // Filtro por data de fim
        const dataFimMatch = !dataFimFiltro ? true : dataTransacao <= dataFimFiltro

        // Filtro para mostrar apenas saldos positivos (opcional)
        const positivoMatch = !mostrarApenasPositivos ? true : transacao.tipo === "entrada"

        return anoMatch && mesMatch && categoriaMatch && dataInicioMatch && dataFimMatch && positivoMatch
      })
      .sort((a, b) => {
        // Ordenação
        if (ordenacao === "valor") {
          return direcaoOrdenacao === "asc" ? a.valor - b.valor : b.valor - a.valor
        } else if (ordenacao === "data") {
          return direcaoOrdenacao === "asc"
            ? new Date(a.data).getTime() - new Date(b.data).getTime()
            : new Date(b.data).getTime() - new Date(a.data).getTime()
        } else if (ordenacao === "categoria") {
          return direcaoOrdenacao === "asc"
            ? a.categoria.localeCompare(b.categoria)
            : b.categoria.localeCompare(a.categoria)
        }
        return 0
      })
  }, [
    transacoes,
    anoFiltro,
    mesFiltro,
    categoriaFiltro,
    dataInicioFiltro,
    dataFimFiltro,
    ordenacao,
    direcaoOrdenacao,
    mostrarApenasPositivos,
  ])

  // Calcular dados por mês
  const dadosPorMes = useMemo(() => {
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

    const dados = meses.map((mes, index) => {
      const transacoesMes = transacoesFiltradas.filter((t) => {
        const data = new Date(t.data)
        return data.getMonth() === index
      })

      const entradas = transacoesMes.filter((t) => t.tipo === "entrada").reduce((sum, t) => sum + t.valor, 0)

      const saidas = transacoesMes.filter((t) => t.tipo === "saida").reduce((sum, t) => sum + t.valor, 0)

      return {
        mes,
        entradas,
        saidas,
        saldo: entradas - saidas,
      }
    })

    return dados
  }, [transacoesFiltradas])

  // Calcular dados por categoria
  const dadosPorCategoria = useMemo(() => {
    const categorias = new Map<string, { entradas: number; saidas: number }>()

    transacoesFiltradas.forEach((t) => {
      if (!categorias.has(t.categoria)) {
        categorias.set(t.categoria, { entradas: 0, saidas: 0 })
      }

      const dados = categorias.get(t.categoria)!
      if (t.tipo === "entrada") {
        dados.entradas += t.valor
      } else {
        dados.saidas += t.valor
      }
    })

    return Array.from(categorias.entries()).map(([categoria, dados]) => ({
      categoria,
      entradas: dados.entradas,
      saidas: dados.saidas,
      total: dados.entradas - dados.saidas,
    }))
  }, [transacoesFiltradas])

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

  // Dados para o gráfico de pizza
  const dadosPizza = useMemo(() => {
    const entradasPorCategoria = new Map<string, number>()
    const saidasPorCategoria = new Map<string, number>()

    transacoesFiltradas.forEach((t) => {
      if (t.tipo === "entrada") {
        entradasPorCategoria.set(t.categoria, (entradasPorCategoria.get(t.categoria) || 0) + t.valor)
      } else {
        saidasPorCategoria.set(t.categoria, (saidasPorCategoria.get(t.categoria) || 0) + t.valor)
      }
    })

    return {
      entradas: Array.from(entradasPorCategoria.entries()).map(([name, value]) => ({ name, value })),
      saidas: Array.from(saidasPorCategoria.entries()).map(([name, value]) => ({ name, value })),
    }
  }, [transacoesFiltradas])

  // Dados para o gráfico de linha (evolução do saldo)
  const dadosEvolucaoSaldo = useMemo(() => {
    // Criar um mapa de datas para saldos
    const saldosPorData = new Map<string, number>()
    let saldoAcumulado = 0

    // Ordenar transações por data
    const transacoesOrdenadas = [...transacoesFiltradas].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    )

    // Calcular saldo acumulado para cada data
    transacoesOrdenadas.forEach((t) => {
      const dataFormatada = format(new Date(t.data), "dd/MM/yyyy")
      const valor = t.tipo === "entrada" ? t.valor : -t.valor
      saldoAcumulado += valor
      saldosPorData.set(dataFormatada, saldoAcumulado)
    })

    // Converter para array para o gráfico
    return Array.from(saldosPorData.entries()).map(([data, saldo]) => ({
      data,
      saldo,
    }))
  }, [transacoesFiltradas])

  const COLORS_ENTRADAS = ["#4CAF50", "#8BC34A", "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800"]
  const COLORS_SAIDAS = ["#F44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3"]

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    // Preparar dados para exportação
    const dataToExport = [
      // Cabeçalho
      ["Relatório Geral"],
      [""],
      ["Período:", getDescricaoPeriodo()],
      [""],

      // Resumo
      ["Resumo Financeiro"],
      ["Total de Entradas", formatCurrency(totais.entradas)],
      ["Total de Saídas", formatCurrency(totais.saidas)],
      ["Saldo", formatCurrency(totais.saldo)],
      [""],

      // Dados mensais
      ["Dados Mensais"],
      ["Mês", "Entradas", "Saídas", "Saldo"],
      ...dadosPorMes.map((d) => [d.mes, d.entradas, d.saidas, d.saldo]),
      [""],

      // Dados por categoria
      ["Dados por Categoria"],
      ["Categoria", "Entradas", "Saídas", "Total"],
      ...dadosPorCategoria.map((d) => [d.categoria, d.entradas, d.saidas, d.total]),
    ]

    // Criar planilha
    const ws = XLSX.utils.aoa_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Geral")

    // Exportar arquivo
    XLSX.writeFile(wb, `Relatorio_Geral_${getDescricaoPeriodo()}.xlsx`)
  }

  const handleExportPDF = () => {
    // Criar novo documento PDF
    const doc = new jsPDF()

    // Adicionar título
    doc.setFontSize(18)
    doc.text("Relatório Geral", 14, 22)

    // Adicionar período
    doc.setFontSize(12)
    doc.text(`Período: ${getDescricaoPeriodo()}`, 14, 32)

    // Adicionar resumo
    doc.setFontSize(14)
    doc.text("Resumo Financeiro", 14, 45)

    doc.setFontSize(12)
    doc.text(`Total de Entradas: ${formatCurrency(totais.entradas)}`, 20, 55)
    doc.text(`Total de Saídas: ${formatCurrency(totais.saidas)}`, 20, 62)
    doc.text(`Saldo: ${formatCurrency(totais.saldo)}`, 20, 69)

    // Adicionar dados mensais
    doc.setFontSize(14)
    doc.text("Dados Mensais", 14, 82)

    doc.autoTable({
      startY: 85,
      head: [["Mês", "Entradas", "Saídas", "Saldo"]],
      body: dadosPorMes.map((d) => [
        d.mes,
        formatCurrency(d.entradas),
        formatCurrency(d.saidas),
        formatCurrency(d.saldo),
      ]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    })

    // Adicionar dados por categoria
    const finalY = (doc as any).lastAutoTable.finalY || 150
    doc.setFontSize(14)
    doc.text("Dados por Categoria", 14, finalY + 15)

    doc.autoTable({
      startY: finalY + 18,
      head: [["Categoria", "Entradas", "Saídas", "Total"]],
      body: dadosPorCategoria.map((d) => [
        d.categoria,
        formatCurrency(d.entradas),
        formatCurrency(d.saidas),
        formatCurrency(d.total),
      ]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    })

    // Salvar o PDF
    doc.save(`Relatorio_Geral_${getDescricaoPeriodo()}.pdf`)
  }

  // Função para obter descrição do período para relatórios
  const getDescricaoPeriodo = () => {
    let descricao = ""

    if (dataInicioFiltro && dataFimFiltro) {
      descricao = `${format(dataInicioFiltro, "dd/MM/yyyy")} a ${format(dataFimFiltro, "dd/MM/yyyy")}`
    } else if (mesFiltro !== "todos" && anoFiltro !== "todos") {
      const nomeMes = getNomeMes(Number.parseInt(mesFiltro))
      descricao = `${nomeMes}/${anoFiltro}`
    } else if (mesFiltro !== "todos") {
      descricao = `${getNomeMes(Number.parseInt(mesFiltro))}`
    } else if (anoFiltro !== "todos") {
      descricao = anoFiltro
    } else {
      descricao = "Todo o período"
    }

    if (categoriaFiltro !== "todas") {
      descricao += ` - Categoria: ${categoriaFiltro}`
    }

    return descricao
  }

  const getNomeMes = (numeroMes: number) => {
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
    return meses[numeroMes - 1]
  }

  // Alternar direção de ordenação
  const toggleOrdenacao = (campo: "valor" | "data" | "categoria") => {
    if (ordenacao === campo) {
      setDirecaoOrdenacao(direcaoOrdenacao === "asc" ? "desc" : "asc")
    } else {
      setOrdenacao(campo)
      setDirecaoOrdenacao("desc")
    }
  }

  // Limpar todos os filtros
  const limparFiltros = () => {
    setAnoFiltro("todos")
    setMesFiltro("todos")
    setCategoriaFiltro("todas")
    setDataInicioFiltro(undefined)
    setDataFimFiltro(undefined)
    setMostrarApenasPositivos(false)
    setOrdenacao("data")
    setDirecaoOrdenacao("desc")
  }

  return (
    <PrintLayout title="Relatório Geral">
      <div className="space-y-6">
        {/* Cabeçalho com título e botões de ação */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold">Relatório Geral</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Visão geral das finanças da igreja</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleExportExcel} className="print:hidden h-9 px-2 md:px-3">
              <FileDown className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Excel</span>
            </Button>

            <Button onClick={handleExportPDF} className="print:hidden h-9 px-2 md:px-3">
              <FileDown className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">PDF</span>
            </Button>

            <Button onClick={handlePrint} className="print:hidden h-9 px-2 md:px-3">
              <Printer className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Imprimir</span>
            </Button>
          </div>
        </div>

        {/* Painel de filtros avançados */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-base font-medium mb-2 md:mb-0">Filtros</h3>
            <Button variant="outline" size="sm" onClick={limparFiltros}>
              Limpar Filtros
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Filtro por Ano */}
            <div className="space-y-2">
              <Label htmlFor="anoFiltro">Ano</Label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger id="anoFiltro">
                  <SelectValue placeholder="Selecionar ano" />
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

            {/* Filtro por Mês */}
            <div className="space-y-2">
              <Label htmlFor="mesFiltro">Mês</Label>
              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger id="mesFiltro">
                  <SelectValue placeholder="Selecionar mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                    <SelectItem key={mes} value={mes.toString()}>
                      {getNomeMes(mes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Categoria */}
            <div className="space-y-2">
              <Label htmlFor="categoriaFiltro">Categoria</Label>
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger id="categoriaFiltro">
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Período Personalizado */}
            <div className="space-y-2">
              <Label>Período Personalizado</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 h-10">
                      {dataInicioFiltro ? format(dataInicioFiltro, "dd/MM/yyyy") : "Data Inicial"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dataInicioFiltro} onSelect={setDataInicioFiltro} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 h-10">
                      {dataFimFiltro ? format(dataFimFiltro, "dd/MM/yyyy") : "Data Final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dataFimFiltro} onSelect={setDataFimFiltro} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Opções adicionais */}
            <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mostrarApenasPositivos"
                  checked={mostrarApenasPositivos}
                  onCheckedChange={(checked) => setMostrarApenasPositivos(checked as boolean)}
                />
                <Label htmlFor="mostrarApenasPositivos">Mostrar apenas entradas (valores positivos)</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de resumo financeiro */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 shadow-sm">
            <h3 className="text-green-700 dark:text-green-300 text-sm md:text-lg font-medium">Total de Entradas</h3>
            <div className="text-lg md:text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
              {formatCurrency(totais.entradas)}
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 shadow-sm">
            <h3 className="text-red-700 dark:text-red-300 text-sm md:text-lg font-medium">Total de Saídas</h3>
            <div className="text-lg md:text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
              {formatCurrency(totais.saidas)}
            </div>
          </div>

          <div
            className={`${totais.saldo >= 0 ? "bg-blue-50 dark:bg-blue-900" : "bg-amber-50 dark:bg-amber-900"} rounded-lg p-4 shadow-sm`}
          >
            <h3
              className={`${totais.saldo >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"} text-sm md:text-lg font-medium`}
            >
              Saldo Atual
            </h3>
            <div
              className={`text-lg md:text-2xl font-bold ${totais.saldo >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"} mt-1`}
            >
              {formatCurrency(totais.saldo)}
            </div>
          </div>
        </div>

        {/* Abas de conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 h-9">
            <TabsTrigger value="resumo" className="text-xs md:text-sm">
              Resumo
            </TabsTrigger>
            <TabsTrigger value="mensal" className="text-xs md:text-sm">
              Dados Mensais
            </TabsTrigger>
            <TabsTrigger value="categorias" className="text-xs md:text-sm">
              Por Categoria
            </TabsTrigger>
            <TabsTrigger value="evolucao" className="text-xs md:text-sm">
              Evolução
            </TabsTrigger>
          </TabsList>

          {/* Aba de Resumo */}
          <TabsContent value="resumo" className="space-y-6">
            {/* Gráficos de pizza */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium mb-2">Entradas por Categoria</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosPizza.entradas}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosPizza.entradas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_ENTRADAS[index % COLORS_ENTRADAS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium mb-2">Saídas por Categoria</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosPizza.saidas}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosPizza.saidas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_SAIDAS[index % COLORS_SAIDAS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Informações do período */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-2">Informações do Período</h3>
              <div className="space-y-2">
                <p>
                  <strong>Período analisado:</strong> {getDescricaoPeriodo()}
                </p>
                <p>
                  <strong>Total de transações:</strong> {transacoesFiltradas.length}
                </p>
                <p>
                  <strong>Maior entrada:</strong>{" "}
                  {formatCurrency(
                    Math.max(...transacoesFiltradas.filter((t) => t.tipo === "entrada").map((t) => t.valor), 0),
                  )}
                </p>
                <p>
                  <strong>Maior saída:</strong>{" "}
                  {formatCurrency(
                    Math.max(...transacoesFiltradas.filter((t) => t.tipo === "saida").map((t) => t.valor), 0),
                  )}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Aba de Dados Mensais */}
          <TabsContent value="mensal" className="space-y-6">
            {/* Gráfico de barras mensal */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-2">Entradas e Saídas Mensais</h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosPorMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="entradas" name="Entradas" fill="#4CAF50" />
                    <Bar dataKey="saidas" name="Saídas" fill="#F44336" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela de dados mensais */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-4">Dados Mensais Detalhados</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Saídas</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosPorMes.map((dados) => (
                      <TableRow key={dados.mes}>
                        <TableCell className="font-medium">{dados.mes}</TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          {formatCurrency(dados.entradas)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400">
                          {formatCurrency(dados.saidas)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${dados.saldo >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}
                        >
                          {formatCurrency(dados.saldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(totais.entradas)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totais.saidas)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${totais.saldo >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}
                      >
                        {formatCurrency(totais.saldo)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Aba de Categorias */}
          <TabsContent value="categorias" className="space-y-6">
            {/* Tabela de dados por categoria */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Dados por Categoria</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleOrdenacao("categoria")}
                    className="flex items-center gap-1"
                  >
                    Categoria
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleOrdenacao("valor")}
                    className="flex items-center gap-1"
                  >
                    Valor
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Saídas</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosPorCategoria.map((dados) => (
                      <TableRow key={dados.categoria}>
                        <TableCell className="font-medium">{dados.categoria}</TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          {formatCurrency(dados.entradas)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400">
                          {formatCurrency(dados.saidas)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${dados.total >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}
                        >
                          {formatCurrency(dados.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(totais.entradas)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totais.saidas)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${totais.saldo >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}
                      >
                        {formatCurrency(totais.saldo)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Gráfico de barras por categoria */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-2">Entradas e Saídas por Categoria</h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosPorCategoria} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="categoria" type="category" width={150} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="entradas" name="Entradas" fill="#4CAF50" />
                    <Bar dataKey="saidas" name="Saídas" fill="#F44336" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Nova aba de Evolução */}
          <TabsContent value="evolucao" className="space-y-6">
            {/* Gráfico de linha para evolução do saldo */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-2">Evolução do Saldo</h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosEvolucaoSaldo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="saldo"
                      name="Saldo"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela de transações */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Transações no Período</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleOrdenacao("data")}
                    className="flex items-center gap-1"
                  >
                    Data
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleOrdenacao("valor")}
                    className="flex items-center gap-1"
                  >
                    Valor
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacoesFiltradas.slice(0, 50).map((transacao) => (
                      <TableRow key={transacao.id}>
                        <TableCell>{format(new Date(transacao.data), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{transacao.tipo === "entrada" ? "Entrada" : "Saída"}</TableCell>
                        <TableCell>{transacao.descricao}</TableCell>
                        <TableCell>{transacao.categoria}</TableCell>
                        <TableCell
                          className={`text-right font-medium ${transacao.tipo === "entrada" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {formatCurrency(transacao.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {transacoesFiltradas.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Mostrando 50 de {transacoesFiltradas.length} transações. Refine os filtros para ver mais.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PrintLayout>
  )
}

