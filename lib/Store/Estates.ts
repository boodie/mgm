import { IPool } from 'promise-mysql';
import Promise = require('bluebird');

import { IEstate, IManager, IEstateMap, IRegion } from '../types';

interface estate_row {
  EstateID?: number
  EstateName: string
  AbuseEmailToEstateOwner: number
  DenyAnonymous: number
  ResetHomeOnTeleport: number
  FixedSun: number
  DenyTransacted: number
  BlockDwell: number
  DenyIdentified: number
  AllowVoice: number
  UseGlobalTime: number
  PricePerMeter: number
  TaxFree: number
  AllowDirectTeleport: number
  RedirectGridX: number
  RedirectGridY: number
  ParentEstateID: number
  SunPosition: number
  EstateSkipScripts: number
  BillableFactor: number
  PublicAccess: number
  AbuseEmail: string
  EstateOwner: string
  DenyMinors: number
}

interface manager_row {
  EstateID: number
  uuid: string
}

interface estate_map_row {
  RegionID: string
  EstateID: number
}

class Estate implements IEstate {
  EstateID: number
  EstateName: string
  EstateOwner: string

  constructor(e: estate_row) {
    this.EstateID = e.EstateID;
    this.EstateName = e.EstateName;
    this.EstateOwner = e.EstateOwner;
  }
}

export class Estates {
  private db: IPool

  constructor(db: IPool) {
    this.db = db;
  }

  getAll(): Promise<IEstate[]> {
    return this.db.query('SELECT * FROM estate_settings WHERE 1').then((rows: estate_row[]) => {
      return <IEstate[]>rows.map((row) => {
        return new Estate(row);
      });
    });
  }


  getManagers(): Promise<IManager[]> {
    return this.db.query('SELECT * FROM estate_managers WHERE 1');
  }

  getMapping(): Promise<IEstateMap[]> {
    return this.db.query('SELECT * FROM estate_map WHERE 1');
  }

  create(name: string, owner: string): Promise<IEstate> {
    let estate: estate_row = {
      EstateName: name,
      EstateOwner: owner,
      AbuseEmailToEstateOwner: 0,
      DenyAnonymous: 1,
      ResetHomeOnTeleport: 0,
      FixedSun: 0,
      DenyTransacted: 0,
      BlockDwell: 0,
      DenyIdentified: 0,
      AllowVoice: 1,
      UseGlobalTime: 1,
      PricePerMeter: 0,
      TaxFree: 1,
      AllowDirectTeleport: 1,
      RedirectGridX: 0,
      RedirectGridY: 0,
      ParentEstateID: 0,
      SunPosition: 0,
      EstateSkipScripts: 0,
      BillableFactor: 0,
      PublicAccess: 1,
      AbuseEmail: '',
      DenyMinors: 0,
    }
    return this.db.query('INSERT INTO estate_settings SET ?', estate).then((result) => {
      estate.EstateID = result.insertId;
      return new Estate(estate);
    });
  }

  destroy(id: number): Promise<void> {
    // make sure there are no regions with this estate before deletion
    // regions must alsways have an estate
    return this.db.query('SELECT * FROM estate_map WHERE EstateID=?', id).then((rows: any[]) => {
      return rows.length;
    }).then((count: number) => {
      if (count !== 0)
        throw new Error('Cannot delete estate ' + id + ', there are ' + count + ' regions still assigned.');
      // safe to wipe
      return Promise.all([
        this.db.query('DELETE FROM estate_settings WHERE EstateID=?', id),
        this.db.query('DELETE FROM estateban WHERE EstateID=?', id),
        this.db.query('DELETE FROM estate_groups WHERE EstateID=?', id),
        this.db.query('DELETE FROM estate_managers WHERE EstateId=?', id), // watch the different EstateID vs EstateId
        this.db.query('DELETE FROM estate_users WHERE EstateID=?', id)
      ]);
    });
  }

  getById(id: number): Promise<IEstate> {
    return this.db.query('SELECT * FROM estate_settings WHERE EstateID=?', id).then((rows: estate_row[]) => {
      if (rows.length !== 1)
        throw new Error('Estate ' + id + ' does not exist')
      return new Estate(rows[0]);
    });
  }

  setEstateForRegion(estate: IEstate, region: IRegion): Promise<void> {
    let row: estate_map_row = {
      RegionID: region.uuid,
      EstateID: estate.EstateID
    }
    return this.db.query('INSERT INTO estate_map SET ? ON DUPLICATE KEY UPDATE EstateID=VALUES(EstateID)', row);
  }
}
