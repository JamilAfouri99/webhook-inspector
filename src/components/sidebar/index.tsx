'use client'

import { EndpointPanel } from './endpoint-panel'
import { BehaviorPanel } from './behavior-panel'
import { ForwardPanel } from './forward-panel'
import { SignaturePanel } from './signature-panel'
import { PlaybooksPanel } from './playbooks-panel'
import { useChannelControls } from './use-channel-controls'

export { SEQUENCE_PRESETS } from './presets'
export type { SequenceStep, SequencePreset } from './presets'

type Props = {
  channelSlug: string
  webhookUrl: string
  activeBehavior: string
  activeScenario: string
  forwardUrl: string | null
  forwardEnabled: boolean
  signatureScheme: string | null
}

export function Sidebar({
  channelSlug,
  webhookUrl,
  activeBehavior,
  activeScenario,
  forwardUrl,
  forwardEnabled,
  signatureScheme,
}: Props) {
  const controls = useChannelControls(channelSlug)

  return (
    <aside className="w-full h-full border-r border-[var(--card-border)] bg-[var(--card)] overflow-y-auto">
      <div className="p-4 space-y-5">
        <EndpointPanel webhookUrl={webhookUrl} />
        <BehaviorPanel activeBehavior={activeBehavior} activeScenario={activeScenario} controls={controls} />
        <ForwardPanel channelSlug={channelSlug} forwardUrl={forwardUrl} forwardEnabled={forwardEnabled} />
        <SignaturePanel channelSlug={channelSlug} signatureScheme={signatureScheme} />
        <PlaybooksPanel controls={controls} />
      </div>
    </aside>
  )
}
