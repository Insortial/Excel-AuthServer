import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { retrieveLotAndPartsOfLotDetails, getLotNumsForJob, retrieveJobDetails, retrievePackageDetails, retrievePackagesFromID, parseSQLLots } from '../src/routes/p&drequests';
import app from "../src/test-index"
