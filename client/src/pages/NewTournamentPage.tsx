import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSports } from '@/api/sports'
import { useCreateTournament } from '@/api/tournaments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  sportId: z.string().min(1, 'Sport is required'),
  format: z.enum([
    'ROUND_ROBIN',
    'SINGLE_ELIMINATION',
    'DOUBLE_ELIMINATION',
    'GROUP_KNOCKOUT',
  ]),
  adminPassword: z.string().min(4, 'Password must be at least 4 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof formSchema>

const formatOptions = [
  { value: 'ROUND_ROBIN', label: 'Round Robin', description: 'Every team plays every other team' },
  { value: 'SINGLE_ELIMINATION', label: 'Single Elimination', description: 'Bracket tournament, lose once and you\'re out' },
  { value: 'GROUP_KNOCKOUT', label: 'Group + Knockout', description: 'Group stage followed by elimination bracket' },
]

export function NewTournamentPage() {
  const navigate = useNavigate()
  const { data: sports, isLoading: sportsLoading } = useSports()
  const createMutation = useCreateTournament()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      format: 'SINGLE_ELIMINATION',
    },
  })

  const selectedFormat = watch('format')

  const onSubmit = async (data: FormData) => {
    try {
      const tournament = await createMutation.mutateAsync({
        name: data.name,
        description: data.description,
        sportId: data.sportId,
        format: data.format,
        adminPassword: data.adminPassword,
      })
      navigate(`/tournaments/${tournament.slug}`)
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Tournament</CardTitle>
          <CardDescription>
            Set up a new tournament for your league or event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                placeholder="Spring Basketball League 2024"
                {...register('name')}
              />
              {errors.name?.message !== undefined && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add details about your tournament..."
                {...register('description')}
              />
              {errors.description?.message !== undefined && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Select
                disabled={sportsLoading}
                onValueChange={(value) => setValue('sportId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a sport" />
                </SelectTrigger>
                <SelectContent>
                  {sports?.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sportId?.message !== undefined && (
                <p className="text-sm text-destructive">{errors.sportId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tournament Format</Label>
              <div className="grid gap-3">
                {formatOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                      selectedFormat === option.value
                        ? 'border-primary bg-primary/5'
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...register('format')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.format?.message !== undefined && (
                <p className="text-sm text-destructive">{errors.format.message}</p>
              )}
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="font-medium">Admin Password</h4>
                <p className="text-sm text-muted-foreground">
                  This password is required to manage teams, start matches, and
                  update scores
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Enter a secure password"
                  {...register('adminPassword')}
                />
                {errors.adminPassword?.message !== undefined && (
                  <p className="text-sm text-destructive">
                    {errors.adminPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword?.message !== undefined && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {createMutation.error instanceof Error && (
              <p className="text-sm text-destructive">
                {createMutation.error.message}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Tournament'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
