import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { json, type ActionFunctionArgs } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { fromUnixTime } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Field } from '../components/field.tsx'
import { Button } from '../ui/button.tsx'
import { Hint } from '../ui/hint.tsx'
import { Label } from '../ui/label.tsx'
import { Select } from '../ui/select.tsx'
import { Textarea } from '../ui/textarea.tsx'

const MAX_UNIXTIME_SECOND = 16980778160

const DataFormatType = {
  AVERAGE: 'Moyenne',
  MEDIAN: 'Médiane',
  SUM: 'Somme',
}

const BucketSizeOptionsToCustom: Record<string, string> = {
  ONE_MINUTE: '1m',
  ONE_HOUR: '1h',
  ONE_DAY: '1d',
  ONE_WEEK: '1w',
  CUSTOM: '',
}

const BucketSizeOptions = {
  ONE_MINUTE: '1 minute',
  ONE_HOUR: '1 hour',
  ONE_DAY: '1 day',
  ONE_WEEK: '1 week',
  CUSTOM: 'Other...',
}

const schema = z
  .object({
    userData: z.string(),
    dataFormat: z.enum([Object.keys(DataFormatType)[0], ...Object.keys(DataFormatType).slice(1)]),
    customBucketSize: z
      .string()
      .regex(/^[0-9]{1,3}[mhdwsy]$/i)
      .optional(),
    bucketSize: z.enum([
      Object.keys(BucketSizeOptions)[0],
      ...Object.keys(BucketSizeOptions).slice(1),
    ]),
  })
  .refine(({ bucketSize, customBucketSize }) => !(bucketSize === 'CUSTOM' && !customBucketSize), {
    path: ['customBucketSize'],
    message: 'Custom bucket size invalid',
  })

function parseTs(date: string) {
  const ts = Number(date)
  if (isNaN(ts)) return null

  if (ts > MAX_UNIXTIME_SECOND) return fromUnixTime(ts / 1000)

  return fromUnixTime(ts)
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const submission = parse(formData, { schema })

  if (!submission.value) {
    return json(submission)
  }

  // Parse data
  const { userData, dataFormat, customBucketSize, bucketSize } = submission.value
  const parseData = userData
    .split('\n')
    .map((line) => {
      const splitted = line.split(' ')
      const timestamp = parseTs(splitted[0])
      const value = Number(splitted[1]?.trim()) || 1

      if (!timestamp) return null
      return { timestamp, value }
    })
    .filter(Boolean) as { timestamp: Date; value: number }[]

  const bucketSizeCustom =
    bucketSize === 'CUSTOM' ? customBucketSize : BucketSizeOptionsToCustom[bucketSize]

  return json(submission)
}

export default function Index() {
  const lastSubmission = useActionData<typeof action>()
  const [form, fields] = useForm({
    constraint: getFieldsetConstraint(schema),
    lastSubmission,
    shouldValidate: 'onInput',
  })

  const bucketSizeRef = useRef<HTMLSelectElement>(null)
  const [showCustom, setShowCustom] = useState(false)
  useEffect(() => {
    if (bucketSizeRef.current) {
      setShowCustom(bucketSizeRef.current?.value === 'CUSTOM')
    }
  }, [bucketSizeRef])

  return (
    <Form method="post" {...form.props} preventScrollReset className="flex flex-col gap-4">
      <div>
        <Label>Data</Label>
        <Textarea
          error={fields.userData.error}
          {...conform.input(fields.userData)}
          cols={50}
          rows={6}
        ></Textarea>
        <Hint error={fields.userData.error}></Hint>
      </div>
      <div>
        <Label>Merge type</Label>
        <Select error={fields.dataFormat.error} {...conform.input(fields.dataFormat)}>
          {Object.keys(DataFormatType).map((type) => (
            <option key={type} value={type}>
              {DataFormatType[type as keyof typeof DataFormatType]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Bucket size</Label>
        <Select
          {...conform.input(fields.bucketSize)}
          ref={bucketSizeRef}
          onChange={(event) => {
            setShowCustom(event.currentTarget.value === 'CUSTOM')
          }}
        >
          {Object.keys(BucketSizeOptions).map((type) => (
            <option key={type} value={type}>
              {BucketSizeOptions[type as keyof typeof BucketSizeOptions]}
            </option>
          ))}
        </Select>
      </div>
      {showCustom && <Field field={fields.customBucketSize} />}
      <Button type="submit" primary>
        Process
      </Button>
    </Form>
  )
}
