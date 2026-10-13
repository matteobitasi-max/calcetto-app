import { match } from './match'
import { league } from './league'
import { player } from './player'
import { series } from './series'
import { pushSubscription } from './push-subscription'

export const schemaTypes = [league, player, match, series, pushSubscription]
