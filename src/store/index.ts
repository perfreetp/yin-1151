import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import type {
  Patient,
  SurgicalCase,
  MediaItem,
  OperatingRoom,
  SupplyItem,
  ContrastAgentRecord,
  ArchiveLog,
  SearchFilters,
  ImagingDevice,
  MediaType,
  ArchiveStatus,
  VerificationRecord,
  VerificationInfo,
  VerifierRole,
  QualityCheckItem,
  QualityCheckSnapshot,
  SurgicalStage,
  AppTabKey,
  NavigationContext,
  ArchiveTask,
  ArchiveTaskCaseResult
} from '../types'

interface AppState {
  patients: Patient[]
  cases: SurgicalCase[]
  operatingRooms: OperatingRoom[]
  archiveLogs: ArchiveLog[]
  currentUser: string
  currentCaseId: string | null
  searchFilters: SearchFilters
  activeTab: AppTabKey
  navigationContext: NavigationContext | null
  archiveTasks: ArchiveTask[]

  addPatient: (patient: Omit<Patient, 'id'>) => Patient
  updatePatient: (id: string, updates: Partial<Patient>) => void
  getPatientById: (id: string) => Patient | undefined

  createCase: (data: {
    patient: Patient
    operatingRoom: string
    surgeryName: string
    surgeon: string
    assistantSurgeon?: string
    startTime: string
  }) => SurgicalCase

  updateCase: (id: string, updates: Partial<SurgicalCase>) => void
  getCaseById: (id: string) => SurgicalCase | undefined
  getCurrentCase: () => SurgicalCase | undefined
  setCurrentCase: (caseId: string | null) => void

  addMediaItem: (caseId: string, data: {
    device: ImagingDevice
    type: MediaType
    fileName: string
    filePath: string
    fileSize: number
    capturedAt: string
    importedAt: string
    stage?: SurgicalStage
    description?: string
  }) => MediaItem

  updateMediaItem: (caseId: string, mediaId: string, updates: Partial<MediaItem>) => void
  removeMediaItem: (caseId: string, mediaId: string) => void
  batchUpdateMediaStage: (caseId: string, mediaIds: string[], stage: SurgicalStage) => void
  batchRemoveMedia: (caseId: string, mediaIds: string[]) => void
  batchMoveMediaDevice: (caseId: string, mediaIds: string[], device: ImagingDevice) => void

  addSupplyItem: (caseId: string, data: Omit<SupplyItem, 'id' | 'caseId'>) => SupplyItem
  updateSupplyItem: (caseId: string, supplyId: string, updates: Partial<SupplyItem>) => void
  removeSupplyItem: (caseId: string, supplyId: string) => void

  updateContrastAgent: (caseId: string, data: ContrastAgentRecord) => void

  verifyCase: (caseId: string, verifier: string, role: VerifierRole) => void
  resetVerification: (caseId: string) => void
  getVerificationInfo: (caseId: string) => VerificationInfo
  archiveCase: (caseId: string, operator: string) => { success: boolean; warnings: string[] }
  batchArchiveCases: (caseIds: string[], operator: string, taskName?: string) => {
    taskId: string
    success: string[]
    failed: { caseId: string; reason: string }[]
    warnings: { caseId: string; items: string[] }[]
  }
  getQualityCheckItems: (caseId: string) => QualityCheckItem[]
  buildQualityCheckSnapshot: (caseId: string, operator: string) => QualityCheckSnapshot | null

  searchCases: (filters: SearchFilters) => SurgicalCase[]

  checkCaseIntegrity: (caseId: string) => { valid: boolean; warnings: string[]; errors: string[] }

  addArchiveLog: (caseId: string, action: ArchiveLog['action'], details: string, operator?: string) => void

  setSearchFilters: (filters: SearchFilters) => void

  navigateTo: (tab: AppTabKey, context?: NavigationContext) => void
  clearNavigationContext: () => void

  getArchiveTasks: () => ArchiveTask[]
  getArchiveTaskById: (id: string) => ArchiveTask | undefined
}

const mockOperatingRooms: OperatingRoom[] = [
  { id: 'or1', name: '介入手术1间', devices: ['dsa', 'fluoroscopy'] },
  { id: 'or2', name: '介入手术2间', devices: ['dsa', 'ultrasound', 'fluoroscopy'] },
  { id: 'or3', name: '介入手术3间', devices: ['dsa', 'endoscope', 'fluoroscopy'] },
  { id: 'or4', name: '复合手术室', devices: ['dsa', 'ultrasound', 'endoscope', 'fluoroscopy'] },
  { id: 'or5', name: '心内科介入室', devices: ['dsa', 'fluoroscopy'] }
]

const mockPatients: Patient[] = [
  { id: 'p1', name: '张三', hospitalNumber: '202606001', gender: 'male', age: 65, department: '心内科' },
  { id: 'p2', name: '李四', hospitalNumber: '202606002', gender: 'female', age: 58, department: '神经外科' },
  { id: 'p3', name: '王五', hospitalNumber: '202606003', gender: 'male', age: 72, department: '血管外科' }
]

const now = dayjs()
const mockCases: SurgicalCase[] = [
  {
    id: 'c1',
    patientId: 'p1',
    patient: mockPatients[0],
    operatingRoom: '介入手术1间',
    surgeryName: '冠状动脉造影+支架植入术',
    surgeon: '张主任',
    assistantSurgeon: '李医生',
    startTime: now.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    status: 'draft',
    mediaItems: [],
    supplies: [],
    verificationRecords: [],
    createdAt: now.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: now.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'c2',
    patientId: 'p2',
    patient: mockPatients[1],
    operatingRoom: '介入手术2间',
    surgeryName: '脑血管造影术',
    surgeon: '王主任',
    startTime: now.subtract(1, 'day').subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    endTime: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    status: 'archived',
    mediaItems: [
      {
        id: 'm1',
        caseId: 'c2',
        device: 'dsa',
        type: 'image',
        stage: 'angiography',
        fileName: 'angiogram_001.jpg',
        filePath: '/mock/angiogram_001.jpg',
        fileSize: 2048000,
        capturedAt: now.subtract(1, 'day').subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        importedAt: now.subtract(1, 'day').subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        description: '左侧颈动脉造影'
      }
    ],
    supplies: [
      { id: 's1', caseId: 'c2', name: '冠脉支架', batchNumber: 'ST20260601', quantity: 1, unit: '个', manufacturer: '某医疗' }
    ],
    contrastAgent: { name: '碘海醇', dosage: 80, unit: 'ml', batchNumber: 'IO20260601' },
    notes: '手术顺利，患者安返病房',
    createdAt: now.subtract(1, 'day').subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    archivedAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    archivedBy: '技师小王',
    verifiedBy: ['技师小王', '护士小李'],
    verificationTime: now.subtract(1, 'day').subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    verificationRecords: [
      {
        id: 'vr-c2-1',
        verifier: '技师小王',
        role: 'technician',
        time: now.subtract(1, 'day').subtract(45, 'minute').format('YYYY-MM-DD HH:mm:ss')
      },
      {
        id: 'vr-c2-2',
        verifier: '护士小李',
        role: 'nurse',
        time: now.subtract(1, 'day').subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss')
      }
    ]
  }
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      patients: mockPatients,
      cases: mockCases,
      operatingRooms: mockOperatingRooms,
      archiveLogs: [],
      currentUser: '技师小王',
      currentCaseId: null,
      searchFilters: {},
      activeTab: 'collection',
      navigationContext: null,
      archiveTasks: [],

      addPatient: (patient) => {
        const newPatient = { ...patient, id: uuidv4() }
        set((state) => ({ patients: [...state.patients, newPatient] }))
        return newPatient
      },

      updatePatient: (id, updates) => {
        set((state) => ({
          patients: state.patients.map((p) => (p.id === id ? { ...p, ...updates } : p))
        }))
      },

      getPatientById: (id) => {
        return get().patients.find((p) => p.id === id)
      },

      createCase: (data) => {
        const newCase: SurgicalCase = {
          id: uuidv4(),
          patientId: data.patient.id,
          patient: data.patient,
          operatingRoom: data.operatingRoom,
          surgeryName: data.surgeryName,
          surgeon: data.surgeon,
          assistantSurgeon: data.assistantSurgeon,
          startTime: data.startTime,
          status: 'draft',
          mediaItems: [],
          supplies: [],
          verificationRecords: [],
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
        }
        set((state) => ({
          cases: [...state.cases, newCase],
          currentCaseId: newCase.id
        }))
        get().addArchiveLog(newCase.id, 'create', '创建手术病例')
        return newCase
      },

      updateCase: (id, updates) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
              : c
          )
        }))
      },

      getCaseById: (id) => {
        return get().cases.find((c) => c.id === id)
      },

      getCurrentCase: () => {
        const { currentCaseId, cases } = get()
        return cases.find((c) => c.id === currentCaseId)
      },

      setCurrentCase: (caseId) => {
        set({ currentCaseId: caseId })
      },

      addMediaItem: (caseId, data) => {
        const newMedia: MediaItem = {
          id: uuidv4(),
          caseId,
          device: data.device,
          type: data.type,
          stage: data.stage || null,
          fileName: data.fileName,
          filePath: data.filePath,
          fileSize: data.fileSize,
          capturedAt: data.capturedAt,
          importedAt: data.importedAt,
          description: data.description
        }
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  mediaItems: [...c.mediaItems, newMedia],
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
        get().addArchiveLog(caseId, 'import_media', `导入${data.fileName}`)
        return newMedia
      },

      updateMediaItem: (caseId, mediaId, updates) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  mediaItems: c.mediaItems.map((m) =>
                    m.id === mediaId ? { ...m, ...updates } : m
                  ),
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
      },

      removeMediaItem: (caseId, mediaId) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  mediaItems: c.mediaItems.filter((m) => m.id !== mediaId),
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
      },

      batchUpdateMediaStage: (caseId, mediaIds, stage) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  mediaItems: c.mediaItems.map((m) =>
                    mediaIds.includes(m.id) ? { ...m, stage } : m
                  ),
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
      },

      batchRemoveMedia: (caseId, mediaIds) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  mediaItems: c.mediaItems.filter((m) => !mediaIds.includes(m.id)),
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
      },

      batchMoveMediaDevice: (caseId, mediaIds, device) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  mediaItems: c.mediaItems.map((m) =>
                    mediaIds.includes(m.id) ? { ...m, device } : m
                  ),
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
      },

      addSupplyItem: (caseId, data) => {
        const newSupply: SupplyItem = {
          id: uuidv4(),
          caseId,
          ...data
        }
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  supplies: [...c.supplies, newSupply],
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
        return newSupply
      },

      updateSupplyItem: (caseId, supplyId, updates) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  supplies: c.supplies.map((s) =>
                    s.id === supplyId ? { ...s, ...updates } : s
                  ),
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
      },

      removeSupplyItem: (caseId, supplyId) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  supplies: c.supplies.filter((s) => s.id !== supplyId),
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
      },

      updateContrastAgent: (caseId, data) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  contrastAgent: data,
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
      },

      getVerificationInfo: (caseId) => {
        const caseData = get().getCaseById(caseId)
        const records = caseData?.verificationRecords || []
        const signedTechnician = records.find((r) => r.role === 'technician')
        const signedNurse = records.find((r) => r.role === 'nurse')
        const missingRoles: string[] = []
        if (!signedTechnician) missingRoles.push('技师')
        if (!signedNurse) missingRoles.push('巡回护士')
        return {
          records,
          count: records.length,
          required: 2,
          isComplete: records.length >= 2,
          missingCount: Math.max(0, 2 - records.length),
          signedTechnician,
          signedNurse,
          missingRoles
        }
      },

      verifyCase: (caseId, verifier, role) => {
        const caseData = get().getCaseById(caseId)
        if (!caseData) return

        const records = caseData.verificationRecords || []
        if (records.some((r) => r.role === role)) {
          return
        }
        if (records.some((r) => r.verifier === verifier)) {
          return
        }

        const newRecord: VerificationRecord = {
          id: uuidv4(),
          verifier,
          role,
          time: dayjs().format('YYYY-MM-DD HH:mm:ss')
        }
        const nextRecords = [...records, newRecord]
        const isComplete = nextRecords.length >= 2

        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  verificationRecords: nextRecords,
                  verifiedBy: nextRecords.map((r) => r.verifier),
                  verificationTime: isComplete
                    ? dayjs().format('YYYY-MM-DD HH:mm:ss')
                    : c.verificationTime,
                  status: isComplete ? 'verified' : 'draft',
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
        const roleLabel = role === 'technician' ? '技师' : '巡回护士'
        get().addArchiveLog(caseId, 'verify', `${verifier}（${roleLabel}）核对确认`, verifier)
      },

      resetVerification: (caseId) => {
        const caseData = get().getCaseById(caseId)
        if (!caseData || caseData.status === 'archived') return

        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  verificationRecords: [],
                  verifiedBy: [],
                  verificationTime: undefined,
                  status: 'draft',
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
        get().addArchiveLog(caseId, 'verify', '重置核对记录')
      },

      getQualityCheckItems: (caseId) => {
        const caseData = get().getCaseById(caseId)
        if (!caseData) return []
        const items: QualityCheckItem[] = []

        const p = caseData.patient
        const patientMessages: string[] = []
        if (!p.name) patientMessages.push('缺少患者姓名')
        if (!p.hospitalNumber) patientMessages.push('缺少住院号')
        if (!p.gender) patientMessages.push('缺少性别')
        if (!p.age && p.age !== 0) patientMessages.push('缺少年龄')
        const patientPassed = patientMessages.length === 0
        items.push({
          key: 'patient_info',
          label: '患者信息',
          category: patientPassed ? 'pass' : 'error',
          passed: patientPassed,
          messages: patientPassed ? ['姓名、住院号、性别、年龄均已填写'] : patientMessages,
          targetWindow: 'collection',
          jumpHint: '前往术中采集 → 切换病例 → 新建或编辑患者信息'
        })

        const totalMedia = caseData.mediaItems.length
        const staged = caseData.mediaItems.filter((m) => m.stage)
        const unstaged = totalMedia - staged.length
        const stageCount: Record<string, number> = {}
        const surgicalStages: SurgicalStage[] = [
          'preoperative',
          'puncture',
          'angiography',
          'stent_deployment',
          'postoperative_review'
        ]
        surgicalStages.forEach((s) => (stageCount[s] = 0))
        staged.forEach((m) => {
          if (m.stage) stageCount[m.stage] = (stageCount[m.stage] || 0) + 1
        })
        const coveredStages = surgicalStages.filter((s) => stageCount[s] > 0)
        const imagingMessages: string[] = []
        let imagingCategory: QualityCheckItem['category'] = 'pass'
        let imagingPassed = true
        if (totalMedia === 0) {
          imagingPassed = false
          imagingCategory = 'warning'
          imagingMessages.push('未导入任何影像资料')
        } else if (unstaged > 0) {
          imagingPassed = false
          imagingCategory = 'error'
          imagingMessages.push(`${unstaged} 个影像未标记阶段`)
        } else {
          const missingStages = surgicalStages.filter((s) => stageCount[s] === 0)
          if (missingStages.length > 0 && missingStages.length < surgicalStages.length) {
            imagingCategory = 'info'
            imagingMessages.push(
              `已覆盖 ${coveredStages.length} 个阶段；可考虑补充：${missingStages
                .map((s) =>
                  s === 'preoperative'
                    ? '术前'
                    : s === 'puncture'
                    ? '穿刺'
                    : s === 'angiography'
                    ? '造影'
                    : s === 'stent_deployment'
                    ? '支架释放'
                    : '术后复查'
                )
                .join('、')}`
            )
          }
          imagingMessages.push(`共 ${totalMedia} 个影像，已标记 ${staged.length} 个`)
        }
        items.push({
          key: 'imaging_stage',
          label: '影像阶段',
          category: imagingCategory,
          passed: imagingPassed,
          messages: imagingMessages,
          targetWindow: 'collection',
          jumpHint: '前往术中采集 → 选择设备 → 导入影像 → 在列表中标记阶段'
        })

        const suppliesCount = caseData.supplies.length
        const supplyMessages: string[] = []
        let supplyCategory: QualityCheckItem['category'] = suppliesCount > 0 ? 'pass' : 'info'
        const supplyPassed = true
        if (suppliesCount === 0) {
          supplyMessages.push('暂未登记耗材（如未使用可忽略）')
        } else {
          const missingBatch = caseData.supplies.filter((s) => !s.batchNumber).length
          if (missingBatch > 0) {
            supplyCategory = 'warning'
            supplyMessages.push(`${missingBatch} 项耗材未填写批号`)
          }
          supplyMessages.push(`已登记 ${suppliesCount} 项耗材`)
        }
        items.push({
          key: 'supplies',
          label: '耗材登记',
          category: supplyCategory,
          passed: supplyPassed,
          messages: supplyMessages,
          targetWindow: 'verification',
          jumpHint: '前往病例核对 → 耗材登记卡片 → 添加 / 编辑'
        })

        const ca = caseData.contrastAgent
        const contrastMessages: string[] = []
        let contrastCategory: QualityCheckItem['category'] = ca ? 'pass' : 'info'
        const contrastPassed = true
        if (!ca) {
          contrastMessages.push('暂未登记造影剂使用（如未使用可忽略）')
        } else {
          if (!ca.name) contrastMessages.push('缺少造影剂名称')
          if (!ca.dosage && ca.dosage !== 0) contrastMessages.push('缺少用量')
          if (!ca.batchNumber) {
            contrastCategory = 'warning'
            contrastMessages.push('建议补充批号以便追溯')
          }
          if (contrastMessages.length === 0) {
            contrastMessages.push(`${ca.name} ${ca.dosage}${ca.unit || ''}${ca.batchNumber ? `（${ca.batchNumber}）` : ''}`)
          }
        }
        items.push({
          key: 'contrast_agent',
          label: '造影剂使用',
          category: contrastCategory,
          passed: contrastPassed,
          messages: contrastMessages,
          targetWindow: 'verification',
          jumpHint: '前往病例核对 → 造影剂使用卡片 → 登记 / 编辑'
        })

        const info = get().getVerificationInfo(caseId)
        const sigMessages: string[] = []
        const sigPassed = info.isComplete
        const sigCategory: QualityCheckItem['category'] = sigPassed ? 'pass' : 'error'
        if (info.records.length === 0) {
          sigMessages.push('尚未开始双人核对（技师 + 巡回护士）')
        } else {
          info.records.forEach((r) =>
            sigMessages.push(
              `${r.role === 'technician' ? '技师' : '巡回护士'}：${r.verifier}（${r.time}）`
            )
          )
          if (!sigPassed) sigMessages.push(`还差 ${info.missingCount} 位：${info.missingRoles.join('、')}`)
        }
        items.push({
          key: 'dual_signature',
          label: '双人签名',
          category: sigCategory,
          passed: sigPassed,
          messages: sigMessages,
          targetWindow: 'verification',
          jumpHint: '前往病例核对 → 双人核对卡片 → 依次完成技师与巡回护士签名'
        })

        return items
      },

      buildQualityCheckSnapshot: (caseId, operator) => {
        const caseData = get().getCaseById(caseId)
        if (!caseData) return null
        const items = get().getQualityCheckItems(caseId)
        const summary = {
          passed: items.filter((i) => i.passed).length,
          total: items.length,
          errorCount: items.filter((i) => i.category === 'error').length,
          warningCount: items.filter((i) => i.category === 'warning').length
        }
        const mediaByStage: Record<string, number> = {}
        caseData.mediaItems.forEach((m) => {
          const key = m.stage || 'unstaged'
          mediaByStage[key] = (mediaByStage[key] || 0) + 1
        })
        const snapshot: QualityCheckSnapshot = {
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          operator,
          items,
          summary,
          mediaByStage,
          mediaUnstaged: caseData.mediaItems.filter((m) => !m.stage).length,
          suppliesCount: caseData.supplies.length,
          contrastAgentPresent: !!caseData.contrastAgent
        }
        return snapshot
      },

      archiveCase: (caseId, operator) => {
        const caseData = get().getCaseById(caseId)
        if (!caseData) {
          return { success: false, warnings: ['病例不存在'] }
        }

        const info = get().getVerificationInfo(caseId)
        if (!info.isComplete) {
          const signedDesc =
            info.records.length > 0
              ? `已确认：${info.records.map((r) => r.verifier).join('、')}`
              : '尚无任何人确认'
          return {
            success: false,
            warnings: [
              `病例尚未完成双人核对，无法归档（${signedDesc}；还差 ${info.missingCount} 位：${info.missingRoles.join('、')}）`
            ]
          }
        }

        const { valid, warnings, errors } = get().checkCaseIntegrity(caseId)
        if (errors.length > 0) {
          return { success: false, warnings: [...errors] }
        }

        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  status: 'archived',
                  archivedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  archivedBy: operator,
                  qualityCheckSnapshot: get().buildQualityCheckSnapshot(caseId, operator) || undefined,
                  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                }
              : c
          )
        }))
        get().addArchiveLog(caseId, 'archive', '完成归档', operator)
        return { success: true, warnings }
      },

      batchArchiveCases: (caseIds, operator, taskName) => {
        const result: Omit<ReturnType<AppState['batchArchiveCases']>, 'taskId'> = {
          success: [],
          failed: [],
          warnings: []
        }
        const caseResults: ArchiveTaskCaseResult[] = []
        const taskId = uuidv4()
        const name = taskName || `批量归档任务-${dayjs().format('YYYY-MM-DD HH:mm')}`

        const task: ArchiveTask = {
          id: taskId,
          name,
          status: 'running',
          operator,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          totalCount: caseIds.length,
          successCount: 0,
          failedCount: 0,
          caseResults: []
        }

        set((state) => ({ archiveTasks: [task, ...state.archiveTasks] }))

        caseIds.forEach((caseId) => {
          const caseData = get().getCaseById(caseId)
          let status: ArchiveTaskCaseResult['status'] = 'failed'
          let reason: string | undefined
          let warningsArr: string[] = []
          let snapshot: QualityCheckSnapshot | undefined

          if (!caseData) {
            reason = '病例不存在'
          } else {
            const info = get().getVerificationInfo(caseId)
            if (!info.isComplete) {
              reason = `未完成双人核对（还差 ${info.missingCount} 位：${info.missingRoles.join('、')}）`
            } else {
              const integrity = get().checkCaseIntegrity(caseId)
              if (integrity.errors.length > 0) {
                reason = integrity.errors.join('；')
              } else if (caseData.status === 'archived') {
                status = 'skipped'
                reason = '已归档，无需重复操作'
              } else {
                snapshot = get().buildQualityCheckSnapshot(caseId, operator) || undefined
                set((state) => ({
                  cases: state.cases.map((c) =>
                    c.id === caseId
                      ? {
                          ...c,
                          status: 'archived',
                          archivedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                          archivedBy: operator,
                          qualityCheckSnapshot: snapshot,
                          updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                        }
                      : c
                  )
                }))
                get().addArchiveLog(caseId, 'archive', '批量归档成功', operator)
                status = 'success'
                result.success.push(caseId)
                if (integrity.warnings.length > 0) {
                  warningsArr = integrity.warnings
                  result.warnings.push({ caseId, items: integrity.warnings })
                }
              }
            }
          }

          if (status === 'failed') result.failed.push({ caseId, reason: reason || '未知错误' })

          const patientName = caseData?.patient.name || '未知'
          const hospitalNumber = caseData?.patient.hospitalNumber || '-'
          const surgeryName = caseData?.surgeryName || '-'
          caseResults.push({
            caseId,
            patientName,
            hospitalNumber,
            surgeryName,
            status,
            reason,
            warnings: warningsArr.length > 0 ? warningsArr : undefined,
            qualityCheckSnapshot: snapshot
          })
        })

        const successCount = caseResults.filter((r) => r.status === 'success').length
        const failedCount = caseResults.filter((r) => r.status === 'failed').length
        let taskStatus: ArchiveTask['status'] = 'success'
        if (failedCount > 0 && successCount > 0) taskStatus = 'partial'
        if (failedCount > 0 && successCount === 0) taskStatus = 'failed'

        set((state) => ({
          archiveTasks: state.archiveTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: taskStatus,
                  successCount,
                  failedCount,
                  finishedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  caseResults
                }
              : t
          )
        }))

        return { taskId, ...result }
      },

      searchCases: (filters) => {
        let result = [...get().cases]

        if (filters.startDate) {
          result = result.filter((c) => dayjs(c.startTime).isAfter(dayjs(filters.startDate)))
        }
        if (filters.endDate) {
          result = result.filter((c) => dayjs(c.startTime).isBefore(dayjs(filters.endDate).endOf('day')))
        }
        if (filters.department) {
          result = result.filter((c) => c.patient.department === filters.department)
        }
        if (filters.surgeon) {
          result = result.filter((c) => c.surgeon.includes(filters.surgeon!))
        }
        if (filters.patientName) {
          result = result.filter((c) => c.patient.name.includes(filters.patientName!))
        }
        if (filters.hospitalNumber) {
          result = result.filter((c) => c.patient.hospitalNumber.includes(filters.hospitalNumber!))
        }
        if (filters.status) {
          result = result.filter((c) => c.status === filters.status)
        }

        return result.sort((a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf())
      },

      checkCaseIntegrity: (caseId) => {
        const caseData = get().getCaseById(caseId)
        const warnings: string[] = []
        const errors: string[] = []

        if (!caseData) {
          return { valid: false, warnings: [], errors: ['病例不存在'] }
        }

        if (!caseData.patient.name || !caseData.patient.hospitalNumber) {
          errors.push('患者信息不完整')
        }

        if (!caseData.surgeryName || !caseData.surgeon) {
          errors.push('手术信息不完整')
        }

        if (caseData.mediaItems.length === 0) {
          warnings.push('未导入任何影像资料')
        }

        const duplicateCheck = new Set<string>()
        caseData.mediaItems.forEach((m) => {
          if (duplicateCheck.has(m.fileName)) {
            warnings.push(`存在重复文件名: ${m.fileName}`)
          }
          duplicateCheck.add(m.fileName)
        })

        const unstagedMedia = caseData.mediaItems.filter((m) => !m.stage)
        if (unstagedMedia.length > 0) {
          errors.push(`${unstagedMedia.length}个影像资料未标记手术阶段`)
        }

        const duplicateCases = get().cases.filter(
          (c) =>
            c.id !== caseId &&
            c.patient.hospitalNumber === caseData.patient.hospitalNumber &&
            dayjs(c.startTime).isSame(dayjs(caseData.startTime), 'day') &&
            c.surgeryName === caseData.surgeryName
        )
        if (duplicateCases.length > 0) {
          warnings.push('可能存在重复病例')
        }

        return {
          valid: errors.length === 0,
          warnings,
          errors
        }
      },

      addArchiveLog: (caseId, action, details, operator) => {
        const log: ArchiveLog = {
          id: uuidv4(),
          caseId,
          action,
          operator: operator ?? get().currentUser,
          timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          details
        }
        set((state) => ({
          archiveLogs: [...state.archiveLogs, log]
        }))
      },

      setSearchFilters: (filters) => {
        set({ searchFilters: filters })
      },

      navigateTo: (tab, context) => {
        if (context?.caseId) {
          set({ currentCaseId: context.caseId })
        }
        set({
          activeTab: tab,
          navigationContext: context || null
        })
      },

      clearNavigationContext: () => {
        set({ navigationContext: null })
      },

      getArchiveTasks: () => {
        return get().archiveTasks
      },

      getArchiveTaskById: (id) => {
        return get().archiveTasks.find((t) => t.id === id)
      }
    }),
    {
      name: 'surgical-archive-storage',
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted as Partial<AppState>) || {}
        if (version < 2 && Array.isArray(state.cases)) {
          state.cases = state.cases.map((c) => {
            const caseData = c as SurgicalCase
            if (caseData.verificationRecords && caseData.verificationRecords.length > 0) {
              return caseData
            }
            const verifiedBy: string[] = caseData.verifiedBy || []
            const fallbackTime =
              caseData.verificationTime ||
              caseData.updatedAt ||
              dayjs().format('YYYY-MM-DD HH:mm:ss')
            const records: VerificationRecord[] = verifiedBy.map((v, idx) => ({
              id: `migrated-${caseData.id}-${idx}`,
              verifier: v,
              role: idx === 0 ? 'technician' : 'nurse',
              time: fallbackTime
            }))
            return { ...caseData, verificationRecords: records }
          })
        }
        if (version < 3 && Array.isArray(state.cases)) {
          state.cases = state.cases.map((c) => {
            const caseData = c as SurgicalCase
            return {
              ...caseData,
              mediaItems: caseData.mediaItems.map((m) => ({
                ...m,
                importedAt: (m as MediaItem).importedAt || m.capturedAt
              }))
            }
          })
        }
        return state as AppState
      }
    }
  )
)
