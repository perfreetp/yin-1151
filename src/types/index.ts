export type SurgicalStage = 'preoperative' | 'puncture' | 'angiography' | 'stent_deployment' | 'postoperative_review'

export type ImagingDevice = 'dsa' | 'ultrasound' | 'endoscope' | 'fluoroscopy'

export type MediaType = 'image' | 'video' | 'sequence'

export type ArchiveStatus = 'draft' | 'verified' | 'archived'

export type VerifierRole = 'technician' | 'nurse'

export interface VerificationRecord {
  id: string
  verifier: string
  role: VerifierRole
  time: string
}

export interface VerificationInfo {
  records: VerificationRecord[]
  count: number
  required: number
  isComplete: boolean
  missingCount: number
  signedTechnician?: VerificationRecord
  signedNurse?: VerificationRecord
  missingRoles: string[]
}

export interface Patient {
  id: string
  name: string
  hospitalNumber: string
  gender: 'male' | 'female'
  age: number
  department: string
}

export interface SurgicalCase {
  id: string
  patientId: string
  patient: Patient
  operatingRoom: string
  surgeryName: string
  surgeon: string
  assistantSurgeon?: string
  startTime: string
  endTime?: string
  status: ArchiveStatus
  mediaItems: MediaItem[]
  supplies: SupplyItem[]
  contrastAgent?: ContrastAgentRecord
  notes?: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
  archivedBy?: string
  verificationRecords: VerificationRecord[]
  verifiedBy?: string[]
  verificationTime?: string
  qualityCheckSnapshot?: QualityCheckSnapshot
}

export type QualityCheckItemKey =
  | 'patient_info'
  | 'imaging_stage'
  | 'supplies'
  | 'contrast_agent'
  | 'dual_signature'

export interface QualityCheckItem {
  key: QualityCheckItemKey
  label: string
  category: 'error' | 'warning' | 'info' | 'pass'
  passed: boolean
  messages: string[]
  targetWindow?: 'collection' | 'verification' | 'archive'
  jumpHint?: string
}

export interface QualityCheckSnapshot {
  createdAt: string
  operator: string
  items: QualityCheckItem[]
  summary: {
    passed: number
    total: number
    errorCount: number
    warningCount: number
  }
  mediaByStage: Record<string, number>
  mediaUnstaged: number
  suppliesCount: number
  contrastAgentPresent: boolean
}

export interface MediaItem {
  id: string
  caseId: string
  device: ImagingDevice
  type: MediaType
  stage: SurgicalStage | null
  fileName: string
  filePath: string
  fileSize: number
  capturedAt: string
  importedAt: string
  thumbnail?: string
  description?: string
}

export interface SupplyItem {
  id: string
  caseId: string
  name: string
  batchNumber: string
  quantity: number
  unit: string
  manufacturer?: string
}

export interface ContrastAgentRecord {
  name: string
  dosage: number
  unit: string
  batchNumber?: string
}

export interface OperatingRoom {
  id: string
  name: string
  devices: ImagingDevice[]
  currentCaseId?: string
}

export interface ArchiveLog {
  id: string
  caseId: string
  action: 'create' | 'update' | 'verify' | 'archive' | 'import_media'
  operator: string
  timestamp: string
  details: string
}

export interface SearchFilters {
  startDate?: string
  endDate?: string
  department?: string
  surgeon?: string
  patientName?: string
  hospitalNumber?: string
  status?: ArchiveStatus
}

export const SurgicalStageLabels: Record<SurgicalStage, string> = {
  preoperative: '术前',
  puncture: '穿刺',
  angiography: '造影',
  stent_deployment: '支架释放',
  postoperative_review: '术后复查'
}

export const ImagingDeviceLabels: Record<ImagingDevice, string> = {
  dsa: 'DSA',
  ultrasound: '超声',
  endoscope: '内镜',
  fluoroscopy: '透视'
}

export const MediaTypeLabels: Record<MediaType, string> = {
  image: '图像',
  video: '视频',
  sequence: '造影序列'
}

export const VerifierRoleLabels: Record<VerifierRole, string> = {
  technician: '技师',
  nurse: '巡回护士'
}

export const ArchiveStatusLabels: Record<ArchiveStatus, string> = {
  draft: '待核对',
  verified: '已核对',
  archived: '已归档'
}
