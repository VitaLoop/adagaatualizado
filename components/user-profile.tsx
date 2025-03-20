"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Camera, Trophy, Award, Star, Edit, Key, Save, User, BarChart, FileSpreadsheet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

type Achievement = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  progress?: number
  maxProgress?: number
}

type UserStats = {
  transactionsCreated: number
  reportsGenerated: number
  sheetsManaged: number
  daysActive: number
  level: number
  xp: number
  nextLevelXp: number
}

type UserProfileProps = {
  updateProfilePhoto?: (photoUrl: string) => void
}

export function UserProfile({ updateProfilePhoto }: UserProfileProps) {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState("perfil")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    username: "",
    bio: "Membro da equipe de tesouraria da ADAG Amor Genuíno.",
    photoUrl: "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [photoUrl, setPhotoUrl] = useState("")

  // Estatísticas do usuário (inicializadas com valores zerados)
  const [userStats, setUserStats] = useState<UserStats>({
    transactionsCreated: 0,
    reportsGenerated: 0,
    sheetsManaged: 0,
    daysActive: 1, // Primeiro dia de acesso
    level: 1, // Nível inicial
    xp: 0, // XP inicial
    nextLevelXp: 100, // XP necessário para o próximo nível
  })

  // Conquistas (inicializadas como não desbloqueadas)
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: "1",
      title: "Primeiros Passos",
      description: "Completou o primeiro login no sistema",
      icon: <Trophy className="h-5 w-5 text-yellow-500" />,
      unlocked: true, // Única conquista desbloqueada inicialmente
      progress: 1,
      maxProgress: 1,
    },
    {
      id: "2",
      title: "Gerente Financeiro",
      description: "Registrou mais de 20 transações",
      icon: <BarChart className="h-5 w-5 text-blue-500" />,
      unlocked: false,
      progress: 0,
      maxProgress: 20,
    },
    {
      id: "3",
      title: "Mestre dos Relatórios",
      description: "Gerou mais de 10 relatórios",
      icon: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
      unlocked: false,
      progress: 0,
      maxProgress: 10,
    },
    {
      id: "4",
      title: "Usuário Dedicado",
      description: "Acessou o sistema por 30 dias",
      icon: <Star className="h-5 w-5 text-purple-500" />,
      unlocked: false,
      progress: 1,
      maxProgress: 30,
    },
    {
      id: "5",
      title: "Especialista em Tesouraria",
      description: "Alcançou o nível 5 no sistema",
      icon: <Award className="h-5 w-5 text-red-500" />,
      unlocked: false,
      progress: 1,
      maxProgress: 5,
    },
  ])

  // Carregar dados do usuário do localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const storedProfileData = localStorage.getItem(`adag-profile-${user.id}`)
      if (storedProfileData) {
        const parsedData = JSON.parse(storedProfileData)
        setProfileData({
          ...profileData,
          ...parsedData,
        })
      }

      // Carregar estatísticas
      const storedStats = localStorage.getItem(`adag-stats-${user.id}`)
      if (storedStats) {
        setUserStats(JSON.parse(storedStats))
      } else {
        // Se não existir, salvar os valores iniciais
        localStorage.setItem(`adag-stats-${user.id}`, JSON.stringify(userStats))
      }

      // Carregar conquistas
      const storedAchievements = localStorage.getItem(`adag-achievements-${user.id}`)
      if (storedAchievements) {
        setAchievements(JSON.parse(storedAchievements))
      } else {
        // Se não existir, salvar os valores iniciais
        localStorage.setItem(`adag-achievements-${user.id}`, JSON.stringify(achievements))
      }

      // Verificar se é o primeiro acesso e atualizar XP
      const firstAccessKey = `adag-first-access-${user.id}`
      if (!localStorage.getItem(firstAccessKey)) {
        // Primeiro acesso - conceder XP inicial
        const updatedStats = {
          ...userStats,
          xp: 5, // 5 XP pelo primeiro login
        }
        setUserStats(updatedStats)
        localStorage.setItem(`adag-stats-${user.id}`, JSON.stringify(updatedStats))
        localStorage.setItem(firstAccessKey, new Date().toISOString())
      }

      // Verificar último acesso para contagem de dias
      const lastAccessKey = `adag-last-access-${user.id}`
      const today = new Date().toDateString()
      const lastAccess = localStorage.getItem(lastAccessKey)

      if (!lastAccess || lastAccess !== today) {
        // Novo dia de acesso
        const updatedStats = {
          ...userStats,
          daysActive: userStats.daysActive + (lastAccess ? 1 : 0),
          xp: userStats.xp + (lastAccess ? 5 : 0), // +5 XP por dia de acesso
        }
        setUserStats(updatedStats)
        localStorage.setItem(`adag-stats-${user.id}`, JSON.stringify(updatedStats))
        localStorage.setItem(lastAccessKey, today)

        // Atualizar conquista de dias ativos
        const updatedAchievements = [...achievements]
        const dedicatedUserAchievement = updatedAchievements.find((a) => a.id === "4")
        if (dedicatedUserAchievement) {
          dedicatedUserAchievement.progress = updatedStats.daysActive
          dedicatedUserAchievement.unlocked =
            dedicatedUserAchievement.progress >= (dedicatedUserAchievement.maxProgress || 30)
          setAchievements(updatedAchievements)
          localStorage.setItem(`adag-achievements-${user.id}`, JSON.stringify(updatedAchievements))
        }
      }
    }
  }, [user])

  // Verificar e atualizar nível com base no XP
  useEffect(() => {
    if (user) {
      // Verificar se o usuário subiu de nível
      const level = Math.floor(userStats.xp / 100) + 1
      const nextLevelXp = level * 100

      if (level !== userStats.level) {
        const updatedStats = {
          ...userStats,
          level,
          nextLevelXp,
        }
        setUserStats(updatedStats)
        localStorage.setItem(`adag-stats-${user.id}`, JSON.stringify(updatedStats))

        // Atualizar conquista de nível
        const updatedAchievements = [...achievements]
        const levelAchievement = updatedAchievements.find((a) => a.id === "5")
        if (levelAchievement) {
          levelAchievement.progress = level
          levelAchievement.unlocked = level >= (levelAchievement.maxProgress || 5)
          setAchievements(updatedAchievements)
          localStorage.setItem(`adag-achievements-${user.id}`, JSON.stringify(updatedAchievements))
        }

        // Notificar o usuário
        if (level > userStats.level) {
          toast({
            title: `Parabéns! Você alcançou o nível ${level}`,
            description: "Continue usando o sistema para ganhar mais XP e desbloquear conquistas.",
          })
        }
      }
    }
  }, [userStats.xp, user])

  // Salvar dados do perfil
  const handleSaveProfile = () => {
    if (typeof window !== "undefined" && user) {
      localStorage.setItem(`adag-profile-${user.id}`, JSON.stringify(profileData))
      setIsEditingProfile(false)
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      })
    }
  }

  // Alterar senha
  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      })
      return
    }

    // Simulação de alteração de senha
    toast({
      title: "Senha alterada",
      description: "Sua senha foi alterada com sucesso.",
    })
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setIsChangingPassword(false)
  }

  // Fazer upload de foto
  const handlePhotoUpload = () => {
    if (!photoUrl) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma URL de imagem válida.",
        variant: "destructive",
      })
      return
    }

    setProfileData({
      ...profileData,
      photoUrl: photoUrl,
    })

    if (typeof window !== "undefined" && user) {
      const updatedProfile = {
        ...profileData,
        photoUrl: photoUrl,
      }
      localStorage.setItem(`adag-profile-${user.id}`, JSON.stringify(updatedProfile))

      // Atualizar a foto no header
      if (updateProfilePhoto) {
        updateProfilePhoto(photoUrl)
      }
    }

    setPhotoUrl("")
    setIsUploadingPhoto(false)
    toast({
      title: "Foto atualizada",
      description: "Sua foto de perfil foi atualizada com sucesso.",
    })
  }

  // Obter iniciais do nome para o avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  // Calcular progresso de nível
  const levelProgress = userStats.xp % 100 // XP dentro do nível atual

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-bold">Perfil do Usuário</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Gerencie suas informações e acompanhe seu progresso
          </p>
        </div>
      </div>

      <Card className="w-full shadow-sm md:shadow">
        <CardContent className="px-3 py-4 md:px-6 md:py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 h-9">
              <TabsTrigger value="perfil" className="text-xs md:text-sm">
                Perfil
              </TabsTrigger>
              <TabsTrigger value="conquistas" className="text-xs md:text-sm">
                Conquistas
              </TabsTrigger>
              <TabsTrigger value="estatisticas" className="text-xs md:text-sm">
                Estatísticas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perfil" className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-4 md:w-1/3">
                  <Avatar className="h-32 w-32 border-2 border-primary">
                    {profileData.photoUrl ? (
                      <AvatarImage src={profileData.photoUrl} alt={profileData.name} />
                    ) : (
                      <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                        {getInitials(profileData.name || user?.name || "")}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Dialog open={isUploadingPhoto} onOpenChange={setIsUploadingPhoto}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Camera className="h-4 w-4" />
                        <span>Alterar Foto</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Alterar Foto de Perfil</DialogTitle>
                        <DialogDescription>Insira a URL da sua nova foto de perfil.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="photoUrl">URL da Imagem</Label>
                          <Input
                            id="photoUrl"
                            placeholder="https://exemplo.com/minha-foto.jpg"
                            value={photoUrl}
                            onChange={(e) => setPhotoUrl(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Você pode usar serviços como iili.io ou freeimage.host para hospedar sua imagem.
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUploadingPhoto(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handlePhotoUpload}>Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        Nível {userStats.level}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {userStats.xp}/{userStats.nextLevelXp} XP
                      </span>
                    </div>
                    <Progress value={levelProgress} className="h-2 w-full mt-2" />
                  </div>
                </div>

                <div className="md:w-2/3">
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="username">Nome de Usuário</Label>
                        <Input
                          id="username"
                          value={profileData.username}
                          onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          disabled
                        />
                        <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bio">Biografia</Label>
                        <Input
                          id="bio"
                          value={profileData.bio}
                          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveProfile}>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-1">
                        <h3 className="text-lg font-semibold">{profileData.name}</h3>
                        <p className="text-sm text-muted-foreground">{profileData.email}</p>
                        {profileData.username && (
                          <p className="text-sm text-muted-foreground">@{profileData.username}</p>
                        )}
                      </div>
                      <div className="grid gap-1">
                        <h4 className="text-sm font-medium">Biografia</h4>
                        <p className="text-sm">{profileData.bio}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Perfil
                        </Button>
                        <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <Key className="mr-2 h-4 w-4" />
                              Alterar Senha
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Alterar Senha</DialogTitle>
                              <DialogDescription>Crie uma nova senha para sua conta.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="currentPassword">Senha Atual</Label>
                                <Input
                                  id="currentPassword"
                                  type="password"
                                  value={passwordData.currentPassword}
                                  onChange={(e) =>
                                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                                  }
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="newPassword">Nova Senha</Label>
                                <Input
                                  id="newPassword"
                                  type="password"
                                  value={passwordData.newPassword}
                                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                <Input
                                  id="confirmPassword"
                                  type="password"
                                  value={passwordData.confirmPassword}
                                  onChange={(e) =>
                                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsChangingPassword(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleChangePassword}>Alterar Senha</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="conquistas" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <Card key={achievement.id} className={`${achievement.unlocked ? "bg-primary/5" : "bg-muted/30"}`}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={`p-2 rounded-full ${achievement.unlocked ? "bg-primary/10" : "bg-muted"}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{achievement.title}</h3>
                          {achievement.unlocked && (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            >
                              Desbloqueado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        {achievement.progress !== undefined && achievement.maxProgress !== undefined && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>
                                {achievement.progress}/{achievement.maxProgress}
                              </span>
                              <span>{Math.round((achievement.progress / achievement.maxProgress) * 100)}%</span>
                            </div>
                            <Progress
                              value={(achievement.progress / achievement.maxProgress) * 100}
                              className="h-1.5"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="estatisticas" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <BarChart className="h-8 w-8 text-primary mb-2" />
                    <h3 className="text-2xl font-bold">{userStats.transactionsCreated}</h3>
                    <p className="text-sm text-muted-foreground text-center">Transações Criadas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <FileSpreadsheet className="h-8 w-8 text-primary mb-2" />
                    <h3 className="text-2xl font-bold">{userStats.reportsGenerated}</h3>
                    <p className="text-sm text-muted-foreground text-center">Relatórios Gerados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <FileSpreadsheet className="h-8 w-8 text-primary mb-2" />
                    <h3 className="text-2xl font-bold">{userStats.sheetsManaged}</h3>
                    <p className="text-sm text-muted-foreground text-center">Planilhas Gerenciadas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <User className="h-8 w-8 text-primary mb-2" />
                    <h3 className="text-2xl font-bold">{userStats.daysActive}</h3>
                    <p className="text-sm text-muted-foreground text-center">Dias Ativos</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progresso de Nível</CardTitle>
                  <CardDescription>Seu progresso atual no sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium">Nível {userStats.level}</h4>
                        <p className="text-sm text-muted-foreground">Próximo nível: {userStats.level + 1}</p>
                      </div>
                      <div className="text-right">
                        <h4 className="font-medium">{userStats.xp} XP</h4>
                        <p className="text-sm text-muted-foreground">
                          Faltam {userStats.nextLevelXp - userStats.xp} XP
                        </p>
                      </div>
                    </div>
                    <Progress value={levelProgress} className="h-2" />
                    <div className="text-sm text-muted-foreground">
                      <p>Ganhe XP completando ações no sistema:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Registrar transações: +10 XP</li>
                        <li>Gerar relatórios: +15 XP</li>
                        <li>Gerenciar planilhas: +20 XP</li>
                        <li>Login diário: +5 XP</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="px-3 py-2 md:px-6 md:py-4 border-t flex justify-end">
          <Button variant="outline" onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            Sair da Conta
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

