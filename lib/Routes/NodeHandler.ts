import { RequestHandler } from 'express';
import { Store } from '../Store';
import { IRegion, IJob, IUser, IHost } from '../types';
import { AuthenticatedRequest } from '../Auth';
import { RegionLogs } from '../regionLogs';
import { RegionINI } from '../Region';
import { Config } from '../Config';
import Promise = require('bluebird');
import { PerformanceStore } from '../Performance';

export function NodeLogHandler(store: Store, logger: RegionLogs): RequestHandler {
  return (req: AuthenticatedRequest, res) => {
    let regionID = req.params.uuid;

    let remoteIP: string = req.ip.split(':').pop();
    store.Hosts.getByAddress(remoteIP).then(() => {
      return store.Regions.getByUUID(regionID.toString())
    }).then((r: IRegion) => {
      let logs: string[] = JSON.parse(req.body.log);
      return logger.append(r, logs);
    }).then(() => {
      res.json({ Success: true });
    }).catch((err: Error) => {
      res.json({ Success: false, Message: err.message });
    });
  };
}

export function NodeHandler(store: Store): RequestHandler {
  interface node_registration {
    slots: string
    public_ip: string
    name: string
    port: string
  }

  return (req: AuthenticatedRequest, res) => {
    let payload: node_registration = req.body;
    let remoteIP: string = req.ip.split(':').pop();
    store.Hosts.getByAddress(remoteIP).then((node: IHost) => {
      return store.Hosts.updateHost(node, payload).then( () => {
        return store.Regions.getByNode(node);
      });
    }).then((regions: IRegion[]) => {
      let result = []
      for (let r of regions) {
        result.push({
          name: r.name,
          uuid: r.uuid,
          locX: r.x,
          locY: r.y
        });
      }
      return res.json({
        Success: true,
        Regions: result
      });
    }).catch((err: Error) => {
      return res.json({ Success: false, Message: err.message });
    });
  };
}


interface hostStat {
  cpuPercent: number[],
  timestamp: Date,
  netSentPer: number,
  netRecvPer: number,
  memPercent: number,
  memKB: number
}

interface procStat {
  id: string
  stats: {
    isRunning: Boolean
    timestamp: Date
  }
}

interface statUpload {
  host: hostStat,
  processes: procStat[]
}


export function NodeStatHandler(store: Store, perf: PerformanceStore): RequestHandler {
  return (req: AuthenticatedRequest, res) => {
    let stats: statUpload = JSON.parse(req.body.json);
    let running = 0;
    let halted = 0;

    let remoteIP: string = req.ip.split(':').pop();
    store.Hosts.getByAddress(remoteIP).then((node: IHost) => {
      return perf.insertHostData(node, JSON.stringify(stats.host));
    }).then(() => {
      return Promise.all(
        stats.processes.map((proc: procStat) => {
          if (proc.stats.isRunning)
            running++;
          else
            halted++;
          return store.Regions.getByUUID(proc.id).then((r: IRegion) => {
            return perf.insertRegionData(r, JSON.stringify(proc.stats));
          });
        })
      );
    }).then(() => {
      res.send('Stats recieved: ' + running + ' running processes, and ' + halted + ' halted processes');
    }).catch((err: Error) => {
      res.json({ Success: false, Message: err.message });
    });
  };
}

export function NodeDownloadHandler(store: Store, defaultOar: string): RequestHandler {
  return (req: AuthenticatedRequest, res) => {
    let jobID = parseInt(req.params.id);

    store.Jobs.getByID(jobID).then((j: IJob) => {
      switch (j.type) {
        case 'load_oar':
          let datum = JSON.parse(j.data);
          res.sendFile(datum.File);
        case 'nuke':
          res.sendFile(defaultOar);
      }

    }).catch((err) => {
      console.log('An error occurred sending a file to a user: ' + err);
    });
  };
}

export function NodeReportHandler(store: Store): RequestHandler {
  return (req: AuthenticatedRequest, res) => {
    let taskID = parseInt(req.params.id);

    store.Jobs.getByID(taskID).then((j: IJob) => {
      let datum = JSON.parse(j.data);
      datum.Status = req.body.Status;
      return store.Jobs.setData(j, JSON.stringify(datum));
    }).then(() => {
      res.send('OK');
    }).catch((err) => {
      console.log(err);
    });
  };
}

interface uploadRequest extends AuthenticatedRequest {
  file: {
    path: string
    originalname: string
    size: string
  }
}
import { EmailMgr } from '../Email';

export function NodeUploadHandler(store: Store): RequestHandler {
  return (req: uploadRequest, res) => {
    let taskID = parseInt(req.params.id);

    console.log('upload file received for job ' + taskID);

    store.Jobs.getByID(taskID).then((j: IJob) => {
      switch (j.type) {
        case 'save_oar':
          let remoteIP: string = req.ip.split(':').pop();
          let fileName: string;
          return Promise.resolve().then(() => {
            let datum = JSON.parse(j.data);
            datum.Status = 'Done';
            datum.File = req.file.path;
            datum.FileName = req.file.originalname;
            datum.Size = req.file.size;
            fileName = datum.FileName;
            return store.Jobs.setData(j, JSON.stringify(datum));
          }).then(() => {
            return store.Users.getByID(j.user);
          }).then((u: IUser) => {
            return EmailMgr.instance().sendSaveOarComplete(u.email, fileName);
          })
        default:
          throw new Error('invalid upload for job type: ' + j.type);
      }
    }).then(() => {
      res.json({ Success: true });
    }).catch((err: Error) => {
      console.log(err);
      res.json({ Success: false, Message: err.message });
    });
  };
}