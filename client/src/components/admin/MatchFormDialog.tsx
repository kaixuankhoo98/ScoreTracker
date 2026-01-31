import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Team, MatchStage } from '@shared/schemas'

const matchFormSchema = z.object({
  homeTeamId: z.string().optional(),
  awayTeamId: z.string().optional(),
  stage: z.enum([
    'GROUP',
    'ROUND_OF_16',
    'QUARTERFINAL',
    'SEMIFINAL',
    'THIRD_PLACE',
    'FINAL',
  ]),
  round: z.number().int().positive(),
  matchNumber: z.number().int().positive(),
  scheduledAt: z.string().optional(),
})

type MatchFormData = z.infer<typeof matchFormSchema>

interface MatchFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: MatchFormData) => Promise<void>
  teams: Team[]
  isPending: boolean
  mode: 'create' | 'edit'
  defaultValues?: Partial<MatchFormData>
  nextMatchNumber?: number
}

const STAGE_OPTIONS: { value: MatchStage; label: string }[] = [
  { value: 'GROUP', label: 'Group Stage' },
  { value: 'ROUND_OF_16', label: 'Round of 16' },
  { value: 'QUARTERFINAL', label: 'Quarterfinal' },
  { value: 'SEMIFINAL', label: 'Semifinal' },
  { value: 'THIRD_PLACE', label: 'Third Place' },
  { value: 'FINAL', label: 'Final' },
]

export function MatchFormDialog({
  open,
  onOpenChange,
  onSubmit,
  teams,
  isPending,
  mode,
  defaultValues,
  nextMatchNumber = 1,
}: MatchFormDialogProps) {
  const form = useForm<MatchFormData>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      stage: 'GROUP',
      round: 1,
      matchNumber: nextMatchNumber,
      ...defaultValues,
    },
  })

  // Reset form when dialog opens with new default values
  useEffect(() => {
    if (open) {
      form.reset({
        stage: 'GROUP',
        round: 1,
        matchNumber: nextMatchNumber,
        ...defaultValues,
      })
    }
  }, [open, defaultValues, nextMatchNumber, form])

  const handleSubmit = async (data: MatchFormData) => {
    await onSubmit(data)
    form.reset()
  }

  // Format datetime-local value for input
  const formatDateTimeLocal = (isoString?: string | null) => {
    if (!isoString) return ''
    return format(parseISO(isoString), "yyyy-MM-dd'T'HH:mm")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Match' : 'Edit Match'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new match in this tournament'
              : 'Edit match details'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Home Team</Label>
              <Controller
                control={form.control}
                name="homeTeamId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) =>
                      field.onChange(value === '__none__' ? undefined : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">TBD</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Away Team</Label>
              <Controller
                control={form.control}
                name="awayTeamId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) =>
                      field.onChange(value === '__none__' ? undefined : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">TBD</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Controller
              control={form.control}
              name="stage"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Round</Label>
              <Input
                type="number"
                min={1}
                {...form.register('round', { valueAsNumber: true })}
              />
              {form.formState.errors.round?.message !== undefined && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.round.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Match Number</Label>
              <Input
                type="number"
                min={1}
                {...form.register('matchNumber', { valueAsNumber: true })}
              />
              {form.formState.errors.matchNumber?.message !== undefined && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.matchNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Scheduled Time (optional)</Label>
            <Input
              type="datetime-local"
              defaultValue={formatDateTimeLocal(defaultValues?.scheduledAt)}
              onChange={(e) => {
                const value = e.target.value
                if (value) {
                  // Convert to ISO string
                  form.setValue('scheduledAt', new Date(value).toISOString())
                } else {
                  form.setValue('scheduledAt', undefined)
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Saving...'
                : mode === 'create'
                  ? 'Create Match'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
