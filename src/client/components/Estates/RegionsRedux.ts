import { Action } from 'redux';
import { Map } from 'immutable';

const ASSIGN_REGION = 'ESTATES_ASSIGN_REGION';
const ASSIGN_REGION_BULK = 'ESTATE_ASSIGN_REGION_BULK';

interface EstateMapAction extends Action {
  region: string
  estate: number
}

interface EstateMapBulkAction extends Action {
  regions: {region: string, estate: number}[]
}

export const AssignRegionEstateAction = function(region: string, estate: number): Action {
  let act: EstateMapAction = {
    type: ASSIGN_REGION,
    region: region,
    estate: estate
  }
  return act;
}

export const AssignRegionEstateBulkAction = function(r: {region: string, estate: number}[]): Action {
  let act: EstateMapBulkAction = {
    type: ASSIGN_REGION_BULK,
    regions: r
  }
  return act;
}

export const EstateMapReducer = function(state = Map<string, number>(), action: Action): Map<string, number> {
  switch (action.type) {
    case ASSIGN_REGION:
      let ra = <EstateMapAction>action;
      return state.set(ra.region, ra.estate);
    case ASSIGN_REGION_BULK:
      let rb = <EstateMapBulkAction>action;
      rb.regions.map( (r: {region: string, estate: number}) => {
        state = state.set(r.region, r.estate);
      });
      return state;
    default:
      return state;
  }
}