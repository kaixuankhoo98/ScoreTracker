import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDeleteMatch } from '@/api/matches'
import type { Team, MatchStage } from '@shared/schemas'

interface MatchAdminCardProps {
  match: {
    id: string
    homeTeamId: string | null
    awayTeamId: string | null
    homeScore: number
    awayScore: number
    status: string
    stage: string
    round: number
    matchNumber: number
    scheduledAt?: string | null
    homeTeam: Team | null
    awayTeam: Team | null
    isBye?: boolean
  }
  tournamentSlug: string
  onEdit: (match: {
    id: string
    homeTeamId?: string
    awayTeamId?: string
    stage: MatchStage
    round: number
    matchNumber: number
    scheduledAt?: string | null
    status: string
  }) => void
}

export function MatchAdminCard({ match, tournamentSlug, onEdit }: MatchAdminCardProps) {
  const deleteMatchMutation = useDeleteMatch(match.id, tournamentSlug)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit({
      id: match.id,
      ...(match.homeTeamId !== null && { homeTeamId: match.homeTeamId }),
      ...(match.awayTeamId !== null && { awayTeamId: match.awayTeamId }),
      stage: match.stage as MatchStage,
      round: match.round,
      matchNumber: match.matchNumber,
      ...(match.scheduledAt !== undefined && { scheduledAt: match.scheduledAt }),
      status: match.status,
    })
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    await deleteMatchMutation.mutateAsync()
    toast.success('Match deleted')
    setDeleteDialogOpen(false)
  }

  const isScheduled = match.status === 'SCHEDULED'

  return (
    <div className="rounded-lg border p-3 transition-colors hover:bg-muted/50 group relative">
      <Link to={`/tournaments/${tournamentSlug}/admin/matches/${match.id}`} className="block">
        <div className="flex items-center justify-between">
          <Badge
            variant={
              match.status === 'LIVE'
                ? 'live'
                : match.status === 'COMPLETED'
                  ? 'success'
                  : 'secondary'
            }
          >
            {match.status}
          </Badge>
          <span className="text-sm text-muted-foreground">#{match.matchNumber}</span>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between">
            <span>{match.homeTeam?.name ?? (match.isBye === true ? 'BYE' : 'TBD')}</span>
            <span className="font-bold">{match.homeScore}</span>
          </div>
          <div className="flex justify-between">
            <span>{match.awayTeam?.name ?? (match.isBye === true ? 'BYE' : 'TBD')}</span>
            <span className="font-bold">{match.awayScore}</span>
          </div>
        </div>
      </Link>

      {/* Edit/Delete buttons - only show on hover for SCHEDULED matches */}
      {isScheduled && (
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleEdit}
            title="Edit match"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            disabled={deleteMatchMutation.isPending}
            title="Delete match"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Match"
        description={`Delete match #${String(match.matchNumber)} between ${match.homeTeam?.name ?? (match.isBye === true ? 'BYE' : 'TBD')} vs ${match.awayTeam?.name ?? (match.isBye === true ? 'BYE' : 'TBD')}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDeleteConfirm()}
        variant="destructive"
        isPending={deleteMatchMutation.isPending}
      />
    </div>
  )
}
