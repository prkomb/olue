import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { Competitor, CompetitorInput } from '@/types/domain'

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^https?:\/\//i.test(v), { message: 'Must start with http(s)://' })

const schema = z.object({
  name: z.string().trim().min(1, 'Required').max(80),
  website: z
    .string()
    .trim()
    .min(1, 'Required')
    .refine((v) => /^https?:\/\//i.test(v), { message: 'Must start with http(s)://' }),
  linkedin: optionalUrl,
  otherSources: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim().min(1, 'Label required'),
        url: z
          .string()
          .trim()
          .refine((v) => /^https?:\/\//i.test(v), { message: 'Must start with http(s)://' }),
      }),
    )
    .default([]),
})

type FormValues = z.infer<typeof schema>

interface Props {
  initial?: Competitor | null
  submitting?: boolean
  onSubmit: (input: CompetitorInput) => void | Promise<void>
  onCancel?: () => void
}

const defaults: FormValues = {
  name: '',
  website: '',
  linkedin: '',
  otherSources: [],
}

export function CompetitorForm({ initial, submitting, onSubmit, onCancel }: Props) {
  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: initial
      ? {
          name: initial.name,
          website: initial.website,
          linkedin: initial.linkedin ?? '',
          otherSources: initial.otherSources.map((s) => ({
            id: s.id,
            label: s.label,
            url: s.url,
          })),
        }
      : defaults,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'otherSources',
  })

  useEffect(() => {
    if (initial) {
      form.reset({
        name: initial.name,
        website: initial.website,
        linkedin: initial.linkedin ?? '',
        otherSources: initial.otherSources.map((s) => ({
          id: s.id,
          label: s.label,
          url: s.url,
        })),
      })
    } else {
      form.reset(defaults)
    }
  }, [initial, form])

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            name: values.name,
            website: values.website,
            linkedin: values.linkedin || undefined,
            otherSources: values.otherSources.map((s) => ({
              id: s.id,
              label: s.label,
              url: s.url,
            })),
          }),
        )}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc." autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="https://acme.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="linkedin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn</FormLabel>
              <FormControl>
                <Input placeholder="https://linkedin.com/company/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Other sources</FormLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => append({ label: '', url: '' })}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
          {fields.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Add pricing pages, changelogs, blogs, careers, Twitter/X, Crunchbase — anything you want monitored.
            </p>
          )}
          <div className="space-y-2">
            {fields.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <FormField
                  control={form.control}
                  name={`otherSources.${idx}.label`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Label" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`otherSources.${idx}.url`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(idx)}
                  aria-label="Remove source"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {initial ? 'Save changes' : 'Add competitor'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
