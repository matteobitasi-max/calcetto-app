import { match } from './match'
import { league } from './league'
import { player } from './player'
import { series } from './series'
import { pushSubscription } from './push-subscription'
import { tournament } from './tournament'
import { abbonamento } from './abbonamento'

export const schemaTypes = [league, player, match, series, tournament, pushSubscription, abbonamento]
