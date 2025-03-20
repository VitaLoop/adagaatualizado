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
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PrintLayout } from "@/components/print-layout"
import { Printer, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/format"
import type { Transacao } from "@/types/schema"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

type RelatorioGeralProps = {
  transacoes: Transacao[]
}

export function RelatorioGeral({ transacoes }: RelatorioGeralProps) {
  const [anoFiltro, setAnoFiltro] = useState<string>(new Date().getFullYear().toString())
  const [activeTab, setActiveTab] = useState("resumo")

  // Gerar anos para o filtro (últimos 5 anos)
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => (anoAtual - i).toString())
  }, [])

  // Filtrar transações por ano
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((transacao) => {
      const dataTransacao = new Date(transacao.data)
      return dataTransacao.getFullYear().toString() === anoFiltro
    })
  }, [transacoes, anoFiltro])

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

  // Calcular totais anuais
  const totaisAnuais = useMemo(() => {
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

  const COLORS_ENTRADAS = ["#4CAF50", "#8BC34A", "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800"]
  const COLORS_SAIDAS = ["#F44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3"]

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    // Preparar dados para exportação
    const dataToExport = [
      // Cabeçalho
      ["Relatório Geral - " + anoFiltro],
      [""],

      // Resumo anual
      ["Resumo Anual"],
      ["Total de Entradas", formatCurrency(totaisAnuais.entradas)],
      ["Total de Saídas", formatCurrency(totaisAnuais.saidas)],
      ["Saldo Anual", formatCurrency(totaisAnuais.saldo)],
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
    XLSX.writeFile(wb, `Relatorio_Geral_${anoFiltro}.xlsx`)
  }

  const handleExportPDF = () => {
    // Criar novo documento PDF
    const doc = new jsPDF()

    // Adicionar título
    doc.setFontSize(18)
    doc.text("Relatório Geral - " + anoFiltro, 14, 22)

    // Adicionar resumo anual
    doc.setFontSize(14)
    doc.text("Resumo Anual", 14, 35)

    doc.setFontSize(12)
    doc.text(`Total de Entradas: ${formatCurrency(totaisAnuais.entradas)}`, 20, 45)
    doc.text(`Total de Saídas: ${formatCurrency(totaisAnuais.saidas)}`, 20, 52)
    doc.text(`Saldo Anual: ${formatCurrency(totaisAnuais.saldo)}`, 20, 59)

    // Adicionar dados mensais
    doc.setFontSize(14)
    doc.text("Dados Mensais", 14, 72)

    doc.autoTable({
      startY: 75,
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
    doc.save(`Relatorio_Geral_${anoFiltro}.pdf`)
  }

  return (
    <PrintLayout title="Relatório Geral">
      <Card className="w-full shadow-sm md:shadow">
        <CardHeader className="px-3 py-2 md:px-6 md:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg md:text-xl">Relatório Geral</CardTitle>
              <CardDescription className="text-xs md:text-sm">Visão geral das finanças da igreja</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger className="w-full sm:w-32 h-9">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((ano) => (
                    <SelectItem key={ano} value={ano}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 h-9">
              <TabsTrigger value="resumo" className="text-xs md:text-sm">
                Resumo
              </TabsTrigger>
              <TabsTrigger value="mensal" className="text-xs md:text-sm">
                Dados Mensais
              </TabsTrigger>
              <TabsTrigger value="categorias" className="text-xs md:text-sm">
                Por Categoria
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-6">
              {/* Cards de resumo anual */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                <Card className="bg-green-50 dark:bg-green-900 shadow-sm">
                  <CardHeader className="pb-1 pt-2 px-3">
                    <CardTitle className="text-green-700 dark:text-green-300 text-sm md:text-lg">
                      Total de Entradas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2 px-3">
                    <div className="text-lg md:text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(totaisAnuais.entradas)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 dark:bg-red-900 shadow-sm">
                  <CardHeader className="pb-1 pt-2 px-3">
                    <CardTitle className="text-red-700 dark:text-red-300 text-sm md:text-lg">Total de Saídas</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2 px-3">
                    <div className="text-lg md:text-2xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(totaisAnuais.saidas)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 dark:bg-blue-900 shadow-sm">
                  <CardHeader className="pb-1 pt-2 px-3">
                    <CardTitle className="text-blue-700 dark:text-blue-300 text-sm md:text-lg">Saldo Anual</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2 px-3">
                    <div className="text-lg md:text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(totaisAnuais.saldo)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos de pizza */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Entradas por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Saídas por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="mensal" className="space-y-6">
              {/* Gráfico de barras mensal */}
              <Card>
                <CardHeader>
                  <CardTitle>Entradas e Saídas Mensais - {anoFiltro}</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              {/* Tabela de dados mensais */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados Mensais Detalhados - {anoFiltro}</CardTitle>
                </CardHeader>
                <CardContent>
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
                          <TableCell className="text-right font-medium">{formatCurrency(dados.saldo)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(totaisAnuais.entradas)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(totaisAnuais.saidas)}
                        </TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(totaisAnuais.saldo)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categorias" className="space-y-6">
              {/* Tabela de dados por categoria */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados por Categoria - {anoFiltro}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Entradas</TableHead>
                        <TableHead className="text-right">Saídas</TableHead>
                        <TableHead className="text-right">Total</TableHead>
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
                          <TableCell className="text-right font-medium">{formatCurrency(dados.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Gráfico de barras por categoria */}
              <Card>
                <CardHeader>
                  <CardTitle>Entradas e Saídas por Categoria - {anoFiltro}</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PrintLayout>
  )
}

