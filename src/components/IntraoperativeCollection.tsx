import React, { useState, useRef, useMemo, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Upload,
  message,
  Divider,
  Typography,
  Alert,
  Segmented,
  List,
  Empty,
  Popconfirm
} from 'antd'
import {
  CameraOutlined,
  UploadOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  FileImageOutlined,
  ScanOutlined,
  ScissorOutlined,
  SyncOutlined,
  PictureOutlined,
  DeleteOutlined,
  SwapOutlined,
  AppstoreOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAppStore } from '../store'
import type {
  SurgicalStage,
  ImagingDevice,
  MediaType,
  MediaItem,
  Patient,
  NavigationContext
} from '../types'
import {
  SurgicalStageLabels,
  ImagingDeviceLabels,
  MediaTypeLabels
} from '../types'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface PatientFormData {
  name: string
  hospitalNumber: string
  gender: 'male' | 'female'
  age: number
  department: string
}

interface CaseFormData {
  operatingRoom: string
  surgeryName: string
  surgeon: string
  assistantSurgeon?: string
  startTime: dayjs.Dayjs
}

export const IntraoperativeCollection: React.FC = () => {
  const [caseFormVisible, setCaseFormVisible] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<ImagingDevice | null>(null)
  const [selectedStage, setSelectedStage] = useState<SurgicalStage | null>(null)
  const [selectedMediaIds, setSelectedMediaIds] = useState<React.Key[]>([])
  const [batchStageVisible, setBatchStageVisible] = useState(false)
  const [batchStageValue, setBatchStageValue] = useState<SurgicalStage | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'batch'>('list')
  const [batchMoveDeviceVisible, setBatchMoveDeviceVisible] = useState(false)
  const [moveTargetDevice, setMoveTargetDevice] = useState<ImagingDevice | null>(null)
  const [highlightCard, setHighlightCard] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    operatingRooms,
    currentCaseId,
    getCurrentCase,
    setCurrentCase,
    createCase,
    addPatient,
    addMediaItem,
    updateMediaItem,
    removeMediaItem,
    batchUpdateMediaStage,
    batchRemoveMedia,
    batchMoveMediaDevice,
    cases,
    checkCaseIntegrity,
    navigationContext,
    clearNavigationContext
  } = useAppStore()

  const currentCase = getCurrentCase()

  const [patientForm] = Form.useForm<PatientFormData>()
  const [caseForm] = Form.useForm<CaseFormData>()

  const activeCases = cases.filter((c) => c.status !== 'archived')

  const detectDeviceFromFileName = (name: string, availableDevices: ImagingDevice[]): ImagingDevice | null => {
    const lower = name.toLowerCase()
    const rules: Array<{ device: ImagingDevice; keywords: string[] }> = [
      { device: 'dsa', keywords: ['dsa', 'angiogram', 'angio', '造影', '造影图'] },
      { device: 'ultrasound', keywords: ['ultrasound', 'us', 'us_', '超声', '彩超', 'b超', 'echo'] },
      { device: 'endoscope', keywords: ['endo', 'scope', '内镜', '内窥', '胃镜', '肠镜', '腔镜'] },
      { device: 'fluoroscopy', keywords: ['fluo', 'fluor', '透视', 'c臂', 'xray', 'x-ray'] }
    ]
    for (const r of rules) {
      if (r.keywords.some((k) => lower.includes(k))) {
        if (availableDevices.includes(r.device)) return r.device
      }
    }
    return null
  }

  const handleCreateCase = async () => {
    try {
      const patientData = await patientForm.validateFields()
      const caseData = await caseForm.validateFields()

      const patient = addPatient({
        ...patientData,
        department: patientData.department || '介入科'
      })

      createCase({
        patient,
        operatingRoom: caseData.operatingRoom,
        surgeryName: caseData.surgeryName,
        surgeon: caseData.surgeon,
        assistantSurgeon: caseData.assistantSurgeon,
        startTime: caseData.startTime.format('YYYY-MM-DD HH:mm:ss')
      })

      setCaseFormVisible(false)
      patientForm.resetFields()
      caseForm.resetFields()
      message.success('病例创建成功')
    } catch {
      message.error('请填写完整信息')
    }
  }

  const handleSelectExistingCase = (caseId: string) => {
    setCurrentCase(caseId)
    message.success('已选择当前病例')
  }

  const handleFileImport = (files: FileList | null) => {
    if (!currentCase) {
      message.warning('请先选择病例')
      return
    }

    if (!files) return

    const availableDevices =
      operatingRooms.find((or) => or.name === currentCase.operatingRoom)?.devices || []

    const byDevice: Record<string, number> = {}
    const byMinute: Record<string, number> = {}
    const nowStr = dayjs().format('YYYY-MM-DD HH:mm:ss')

    Array.from(files).forEach((file) => {
      let mediaType: MediaType = 'image'
      if (file.type.startsWith('video/')) {
        mediaType = 'video'
      } else if (
        file.name.toLowerCase().includes('sequence') ||
        file.name.toLowerCase().includes('seq')
      ) {
        mediaType = 'sequence'
      }

      const autoDevice = detectDeviceFromFileName(file.name, availableDevices)
      const device: ImagingDevice = autoDevice || selectedDevice || availableDevices[0] || 'dsa'

      const capturedAt = file.lastModified
        ? dayjs(file.lastModified).format('YYYY-MM-DD HH:mm:ss')
        : nowStr

      addMediaItem(currentCase.id, {
        device,
        type: mediaType,
        fileName: file.name,
        filePath: file.name,
        fileSize: file.size,
        capturedAt,
        importedAt: nowStr,
        stage: selectedStage || undefined
      })

      byDevice[device] = (byDevice[device] || 0) + 1
      const timeBucket = dayjs(capturedAt).format('YYYY-MM-DD HH:mm')
      byMinute[timeBucket] = (byMinute[timeBucket] || 0) + 1
    })

    const timeBuckets = Object.keys(byMinute).length
    const deviceDesc = Object.entries(byDevice)
      .map(([d, n]) => `${ImagingDeviceLabels[d as ImagingDevice] || d} × ${n}`)
      .join('、')
    message.success(
      `成功导入 ${files.length} 个文件${deviceDesc ? `（${deviceDesc}）` : ''}${
        timeBuckets > 1 ? `，已按 ${timeBuckets} 个拍摄时段分组` : ''
      }`
    )
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const integrityCheck = currentCase ? checkCaseIntegrity(currentCase.id) : null

  useEffect(() => {
    if (navigationContext?.highlightCard) {
      setHighlightCard(navigationContext.highlightCard)
      const timer = setTimeout(() => setHighlightCard(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [navigationContext])

  useEffect(() => {
    if (navigationContext?.caseId && navigationContext.fromTab) {
      clearNavigationContext()
    }
  }, [navigationContext, clearNavigationContext])

  interface MediaBatch {
    id: string
    device: ImagingDevice
    timeBucket: string
    startTime: string
    endTime: string
    mediaIds: string[]
    count: number
    stageDist: Record<string, number>
    unstaged: number
  }

  const mediaBatches = useMemo<MediaBatch[]>(() => {
    if (!currentCase) return []
    const bucketSizeMinutes = 5
    const bucketMap = new Map<string, MediaBatch>()
    currentCase.mediaItems.forEach((m) => {
      const time = dayjs(m.capturedAt)
      const minuteBucket = Math.floor(time.minute() / bucketSizeMinutes) * bucketSizeMinutes
      const bucketKey = `${m.device}--${time.format('YYYYMMDDHH')}-${String(minuteBucket).padStart(2, '0')}`
      const stageKey = m.stage || 'unstaged'
      if (!bucketMap.has(bucketKey)) {
        bucketMap.set(bucketKey, {
          id: bucketKey,
          device: m.device,
          timeBucket: time.format('YYYY-MM-DD HH:') + String(minuteBucket).padStart(2, '0'),
          startTime: m.capturedAt,
          endTime: m.capturedAt,
          mediaIds: [m.id],
          count: 1,
          stageDist: { [stageKey]: 1 },
          unstaged: m.stage ? 0 : 1
        })
      } else {
        const b = bucketMap.get(bucketKey)!
        b.mediaIds.push(m.id)
        b.count += 1
        b.stageDist[stageKey] = (b.stageDist[stageKey] || 0) + 1
        if (dayjs(m.capturedAt).isBefore(b.startTime)) b.startTime = m.capturedAt
        if (dayjs(m.capturedAt).isAfter(b.endTime)) b.endTime = m.capturedAt
        if (!m.stage) b.unstaged += 1
      }
    })
    return Array.from(bucketMap.values()).sort((a, b) => {
      if (a.device !== b.device) return a.device.localeCompare(b.device)
      return dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf()
    })
  }, [currentCase])

  const selectedBatchIds = useMemo(() => {
    const set = new Set(selectedMediaIds as string[])
    return mediaBatches
      .filter((b) => b.mediaIds.every((id) => set.has(id)) && b.mediaIds.length > 0)
      .map((b) => b.id)
  }, [mediaBatches, selectedMediaIds])

  const handleBatchSelectAll = (batchId: string, selected: boolean) => {
    const batch = mediaBatches.find((b) => b.id === batchId)
    if (!batch) return
    if (selected) {
      const merged = Array.from(new Set([...(selectedMediaIds as string[]), ...batch.mediaIds]))
      setSelectedMediaIds(merged)
    } else {
      const batchSet = new Set(batch.mediaIds)
      setSelectedMediaIds((selectedMediaIds as string[]).filter((id) => !batchSet.has(id)))
    }
  }

  const handleBatchSetStage = (batchIds: string[], stage: SurgicalStage) => {
    if (!currentCase) return
    const ids = batchIds.flatMap((bid) => mediaBatches.find((b) => b.id === bid)?.mediaIds || [])
    if (ids.length === 0) {
      message.warning('没有可操作的影像')
      return
    }
    batchUpdateMediaStage(currentCase.id, ids, stage)
    message.success(`已将 ${ids.length} 个影像标记为「${SurgicalStageLabels[stage]}」`)
    setSelectedMediaIds([])
    setBatchStageVisible(false)
  }

  const handleBatchDelete = (batchIds: string[]) => {
    if (!currentCase) return
    const ids = batchIds.flatMap((bid) => mediaBatches.find((b) => b.id === bid)?.mediaIds || [])
    if (ids.length === 0) return
    Modal.confirm({
      title: '批量删除',
      content: `确认删除选中批次的 ${ids.length} 个影像吗？此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        batchRemoveMedia(currentCase.id, ids)
        message.success(`已删除 ${ids.length} 个影像`)
        setSelectedMediaIds([])
      }
    })
  }

  const handleBatchMoveDevice = (batchIds: string[], device: ImagingDevice) => {
    if (!currentCase) return
    const ids = batchIds.flatMap((bid) => mediaBatches.find((b) => b.id === bid)?.mediaIds || [])
    if (ids.length === 0) return
    batchMoveMediaDevice(currentCase.id, ids, device)
    message.success(`已将 ${ids.length} 个影像移至 ${ImagingDeviceLabels[device]}`)
    setSelectedMediaIds([])
    setBatchMoveDeviceVisible(false)
  }

  const mediaColumns = [
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      width: 80,
      render: (device: ImagingDevice) => (
        <Tag color="blue">{ImagingDeviceLabels[device]}</Tag>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: MediaType) => {
        const icons = {
          image: <FileImageOutlined />,
          video: <PlayCircleOutlined />,
          sequence: <ScanOutlined />
        }
        return (
          <Space>
            {icons[type]}
            {MediaTypeLabels[type]}
          </Space>
        )
      }
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`
    },
    {
      title: '拍摄时间',
      dataIndex: 'capturedAt',
      key: 'capturedAt',
      width: 160
    },
    {
      title: '手术阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 120,
      render: (stage: SurgicalStage | null, record: MediaItem) => (
        <Select
          value={stage}
          style={{ width: '100%' }}
          size="small"
          placeholder="标记阶段"
          onChange={(value) =>
            currentCase && updateMediaItem(currentCase.id, record.id, { stage: value })
          }
        >
          {Object.entries(SurgicalStageLabels).map(([key, label]) => (
            <Option key={key} value={key}>
              {label}
            </Option>
          ))}
        </Select>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: MediaItem) => (
        <Button
          type="link"
          danger
          size="small"
          onClick={() => currentCase && removeMediaItem(currentCase.id, record.id)}
        >
          删除
        </Button>
      )
    }
  ]

  const handleConfirmBatchStageCommon = () => {
    if (!currentCase) return
    if (!batchStageValue) {
      message.warning('请选择目标阶段')
      return
    }
    if (viewMode === 'batch' && selectedBatchIds.length > 0) {
      handleBatchSetStage(selectedBatchIds, batchStageValue)
    } else {
      handleConfirmBatchStage()
    }
  }

  const handleConfirmBatchMoveDevice = () => {
    if (!currentCase || !moveTargetDevice) return
    if (viewMode === 'batch' && selectedBatchIds.length > 0) {
      handleBatchMoveDevice(selectedBatchIds, moveTargetDevice)
    } else if (selectedMediaIds.length > 0) {
      batchMoveMediaDevice(
        currentCase.id,
        selectedMediaIds.map((k) => k as string),
        moveTargetDevice
      )
      message.success(
        `已将 ${selectedMediaIds.length} 个影像移至 ${ImagingDeviceLabels[moveTargetDevice]}`
      )
      setSelectedMediaIds([])
      setBatchMoveDeviceVisible(false)
    }
  }

  const openBatchStageModal = () => {
    if (!currentCase) return
    if (selectedMediaIds.length === 0) {
      message.warning('请先勾选需要标记阶段的影像')
      return
    }
    setBatchStageValue(null)
    setBatchStageVisible(true)
  }

  const handleConfirmBatchStage = () => {
    if (!currentCase) return
    if (!batchStageValue) {
      message.warning('请选择目标阶段')
      return
    }
    batchUpdateMediaStage(
      currentCase.id,
      selectedMediaIds.map((k) => k as string),
      batchStageValue
    )
    message.success(`已将 ${selectedMediaIds.length} 个影像标记为「${SurgicalStageLabels[batchStageValue]}」`)
    setSelectedMediaIds([])
    setBatchStageVisible(false)
  }

  const openBatchDeleteConfirm = () => {
    if (!currentCase) return
    if (selectedMediaIds.length === 0) {
      message.warning('请先勾选需要删除的影像')
      return
    }
    Modal.confirm({
      title: '批量删除',
      content: `确认删除已勾选的 ${selectedMediaIds.length} 个影像吗？此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        batchRemoveMedia(
          currentCase.id,
          selectedMediaIds.map((k) => k as string)
        )
        message.success(`已删除 ${selectedMediaIds.length} 个影像`)
        setSelectedMediaIds([])
      }
    })
  }

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              术中采集
            </Title>
          </Col>
          <Col flex="auto" />
          <Col>
            {!currentCase && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCaseFormVisible(true)}
              >
                新建病例
              </Button>
            )}
          </Col>
        </Row>
      </div>

      {!currentCase ? (
        <Card title="选择当台病例" style={{ flex: 1 }}>
          {activeCases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Text type="secondary">暂无进行中的手术病例</Text>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCaseFormVisible(true)}>
                  新建病例
                </Button>
              </div>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {activeCases.map((c) => (
                <Col xs={24} sm={12} lg={8} key={c.id}>
                  <Card
                    hoverable
                    onClick={() => handleSelectExistingCase(c.id)}
                    actions={[
                      <Button type="primary" block onClick={() => handleSelectExistingCase(c.id)}>
                        选择此病例
                      </Button>
                    ]}
                  >
                    <Card.Meta
                      title={c.patient.name}
                      description={
                        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                          <Text type="secondary">住院号: {c.patient.hospitalNumber}</Text>
                          <Text>{c.surgeryName}</Text>
                          <Tag color="blue">{c.operatingRoom}</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            开始时间: {c.startTime}
                          </Text>
                          <Tag color={c.status === 'draft' ? 'orange' : 'green'}>
                            {c.status === 'draft' ? '采集中' : '已核对'}
                          </Tag>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      ) : (
        <>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Space orientation="vertical" size={4}>
                  <Space>
                    <Text strong style={{ fontSize: 18 }}>
                      {currentCase.patient.name}
                    </Text>
                    <Tag color="blue">{currentCase.operatingRoom}</Tag>
                    <Tag color="orange">{currentCase.patient.department}</Tag>
                  </Space>
                  <Space>
                    <Text type="secondary">住院号: {currentCase.patient.hospitalNumber}</Text>
                    <Text type="secondary">|</Text>
                    <Text>{currentCase.surgeryName}</Text>
                    <Text type="secondary">|</Text>
                    <Text>术者: {currentCase.surgeon}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    开始时间: {currentCase.startTime}
                  </Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button icon={<SyncOutlined />} onClick={() => setCurrentCase(null)}>
                    切换病例
                  </Button>
                </Space>
              </Col>
            </Row>
            {integrityCheck && (integrityCheck.warnings.length > 0 || integrityCheck.errors.length > 0) && (
              <div style={{ marginTop: 12 }}>
                {integrityCheck.errors.map((err, idx) => (
                  <Alert key={idx} message={err} type="error" showIcon style={{ marginBottom: 4 }} />
                ))}
                {integrityCheck.warnings.map((warn, idx) => (
                  <Alert key={idx} message={warn} type="warning" showIcon style={{ marginBottom: 4 }} />
                ))}
              </div>
            )}
          </Card>

          <Card size="small" style={{ marginBottom: 16 }}>
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              <Row gutter={16} align="middle">
                <Col>
                  <Text strong>选择设备:</Text>
                </Col>
                <Col flex="auto">
                  <Space wrap>
                    {(operatingRooms.find((or) => or.name === currentCase.operatingRoom)?.devices || []).map(
                      (device) => (
                        <Button
                          key={device}
                          type={selectedDevice === device ? 'primary' : 'default'}
                          icon={<CameraOutlined />}
                          onClick={() => setSelectedDevice(device)}
                        >
                          {ImagingDeviceLabels[device]}
                        </Button>
                      )
                    )}
                  </Space>
                </Col>
              </Row>

              <Row gutter={16} align="middle">
                <Col>
                  <Text strong>手术阶段:</Text>
                </Col>
                <Col flex="auto">
                  <Space wrap>
                    {Object.entries(SurgicalStageLabels).map(([key, label]) => (
                      <Button
                        key={key}
                        type={selectedStage === key ? 'primary' : 'default'}
                        icon={<ScissorOutlined />}
                        onClick={() => setSelectedStage(key as SurgicalStage)}
                      >
                        {label}
                      </Button>
                    ))}
                    <Button
                      type={selectedStage === null ? 'primary' : 'default'}
                      onClick={() => setSelectedStage(null)}
                    >
                      清除选择
                    </Button>
                  </Space>
                </Col>
              </Row>

              <Divider style={{ margin: '8px 0' }} />

              <Row gutter={16} align="middle">
                <Col>
                  <Button
                    type="primary"
                    size="large"
                    icon={<UploadOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    一键导入资料
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileImport(e.target.files)}
                  />
                </Col>
                <Col flex="auto">
                  <Space wrap>
                    {selectedDevice && (
                      <Tag color="blue">当前设备：{ImagingDeviceLabels[selectedDevice]}</Tag>
                    )}
                    <Text type="secondary">
                      已导入 <Text strong>{currentCase.mediaItems.length}</Text> 个文件
                    </Text>
                    {selectedStage && (
                      <Tag color="green">当前阶段: {SurgicalStageLabels[selectedStage]}</Tag>
                    )}
                    <Tag color="cyan">
                      未选设备时将按文件名自动识别（DSA / 超声 / 内镜 / 透视）
                    </Tag>
                  </Space>
                </Col>
                <Col>
                  <Button
                    onClick={() => {
                      const mockFiles = [
                        { name: 'DSA_img_001.jpg', size: 2048000, offsetMin: -12 },
                        { name: 'DSA_img_002.jpg', size: 2100000, offsetMin: -10 },
                        { name: 'DSA_img_003.jpg', size: 1980000, offsetMin: -8 },
                        { name: '超声检查_001.jpg', size: 1890000, offsetMin: -6 },
                        { name: '超声检查_002.jpg', size: 1750000, offsetMin: -5 },
                        { name: '内镜_video_001.mp4', size: 15728640, offsetMin: -15 },
                        { name: 'fluoroscopy_img_001.jpg', size: 1678000, offsetMin: -3 },
                        { name: 'fluoroscopy_img_002.jpg', size: 1720000, offsetMin: -2 },
                        { name: 'angio_seq_001.mp4', size: 15728640, offsetMin: -7 }
                      ]
                      if (!currentCase) {
                        message.warning('请先选择病例')
                        return
                      }
                      const availableDevices =
                        operatingRooms.find((or) => or.name === currentCase.operatingRoom)?.devices ||
                        []
                      const byDevice: Record<string, number> = {}
                      const nowStr = dayjs().format('YYYY-MM-DD HH:mm:ss')
                      mockFiles.forEach((file) => {
                        let mediaType: MediaType = 'image'
                        if (file.name.includes('seq')) mediaType = 'sequence'
                        if (file.name.toLowerCase().includes('video')) mediaType = 'video'
                        const autoDevice =
                          detectDeviceFromFileName(file.name, availableDevices) ||
                          selectedDevice ||
                          availableDevices[0] ||
                          'dsa'
                        const capturedAt = dayjs()
                          .subtract(Math.abs(file.offsetMin || 0), 'minute')
                          .format('YYYY-MM-DD HH:mm:ss')
                        addMediaItem(currentCase.id, {
                          device: autoDevice,
                          type: mediaType,
                          fileName: file.name,
                          filePath: file.name,
                          fileSize: file.size,
                          capturedAt,
                          importedAt: nowStr,
                          stage: selectedStage || undefined
                        })
                        byDevice[autoDevice] = (byDevice[autoDevice] || 0) + 1
                      })
                      const desc = Object.entries(byDevice)
                        .map(
                          ([d, n]) => `${ImagingDeviceLabels[d as ImagingDevice] || d} × ${n}`
                        )
                        .join('、')
                      message.success(
                        `模拟导入 ${mockFiles.length} 个文件（${desc}），已按拍摄时间自动分组为批次`
                      )
                    }}
                  >
                    模拟导入（多设备+批次）
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>

          <Card
            size="small"
            title={
              <Space wrap>
                <Text>影像资料</Text>
                <Tag color="blue">{currentCase.mediaItems.length} 个文件</Tag>
                <Segmented
                  size="small"
                  value={viewMode}
                  onChange={(v) => setViewMode(v as 'list' | 'batch')}
                  options={[
                    { value: 'list', label: '列表视图', icon: <UnorderedListOutlined /> },
                    { value: 'batch', label: '批次视图', icon: <AppstoreOutlined /> }
                  ]}
                />
                {selectedMediaIds.length > 0 && viewMode === 'list' && (
                  <>
                    <Tag color="gold">已勾选 {selectedMediaIds.length}</Tag>
                    <Button
                      size="small"
                      type="primary"
                      icon={<ScissorOutlined />}
                      onClick={openBatchStageModal}
                    >
                      批量标记阶段
                    </Button>
                    <Button
                      size="small"
                      icon={<SwapOutlined />}
                      onClick={() => {
                        setMoveTargetDevice(null)
                        setBatchMoveDeviceVisible(true)
                      }}
                    >
                      批量移设备
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={openBatchDeleteConfirm}
                    >
                      批量删除
                    </Button>
                  </>
                )}
                {selectedBatchIds.length > 0 && viewMode === 'batch' && (
                  <>
                    <Tag color="gold">已选 {selectedBatchIds.length} 个批次</Tag>
                    <Button
                      size="small"
                      type="primary"
                      icon={<ScissorOutlined />}
                      onClick={() => {
                        setBatchStageValue(null)
                        setBatchStageVisible(true)
                      }}
                    >
                      批量标记阶段
                    </Button>
                    <Button
                      size="small"
                      icon={<SwapOutlined />}
                      onClick={() => {
                        setMoveTargetDevice(null)
                        setBatchMoveDeviceVisible(true)
                      }}
                    >
                      移至其他设备
                    </Button>
                    <Popconfirm
                      title="批量删除"
                      description={`确认删除选中的 ${selectedBatchIds.length} 个批次共 ${selectedMediaIds.length} 个影像？`}
                      okText="删除"
                      okButtonProps={{ danger: true }}
                      cancelText="取消"
                      onConfirm={() => handleBatchDelete(selectedBatchIds)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />}>
                        批量删除
                      </Button>
                    </Popconfirm>
                  </>
                )}
              </Space>
            }
            extra={
              selectedMediaIds.length > 0 ? (
                <Button size="small" onClick={() => setSelectedMediaIds([])}>
                  清空勾选
                </Button>
              ) : null
            }
            style={{ flex: 1, overflow: 'auto' }}
            bodyStyle={{ padding: viewMode === 'list' ? 0 : 12 }}
          >
            {viewMode === 'list' ? (
              <Table
                dataSource={currentCase.mediaItems}
                columns={mediaColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 300 }}
                rowSelection={{
                  selectedRowKeys: selectedMediaIds,
                  onChange: (keys) => setSelectedMediaIds(keys),
                  checkStrictly: true
                }}
              />
            ) : mediaBatches.length === 0 ? (
              <Empty
                description="暂无影像批次"
                style={{ padding: 48 }}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Row gutter={[12, 12]}>
                {mediaBatches.map((batch) => {
                  const allSelected = batch.mediaIds.every((id) =>
                    (selectedMediaIds as string[]).includes(id)
                  )
                  const someSelected = batch.mediaIds.some((id) =>
                    (selectedMediaIds as string[]).includes(id)
                  )
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={batch.id}>
                      <Card
                        size="small"
                        style={{
                          cursor: 'pointer',
                          borderColor: allSelected ? '#1677ff' : undefined,
                          boxShadow: allSelected ? '0 0 0 2px rgba(22,119,255,0.2)' : undefined
                        }}
                        onClick={() => handleBatchSelectAll(batch.id, !allSelected)}
                        title={
                          <Space size={4}>
                            <PictureOutlined />
                            <Text strong>{ImagingDeviceLabels[batch.device]}</Text>
                            <Tag color="geekblue" style={{ margin: 0 }}>
                              {batch.count} 个
                            </Tag>
                          </Space>
                        }
                        extra={
                          <Tag color={allSelected ? 'blue' : someSelected ? 'gold' : 'default'}>
                            {allSelected ? '全选' : someSelected ? '部分' : '未选'}
                          </Tag>
                        }
                      >
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {batch.timeBucket} 起 · {dayjs(batch.endTime).format('HH:mm')} 止
                          </Text>
                          <Row gutter={[4, 4]}>
                            {Object.entries(batch.stageDist).map(([stage, count]) => (
                              <Col key={stage} span={24}>
                                <Tag color={stage === 'unstaged' ? 'red' : 'green'}>
                                  {stage === 'unstaged'
                                    ? '未标记'
                                    : SurgicalStageLabels[stage as SurgicalStage]}
                                  ：{count}
                                </Tag>
                              </Col>
                            ))}
                          </Row>
                          {batch.unstaged > 0 && (
                            <Tag color="red">⚠ 未标记阶段 {batch.unstaged} 个</Tag>
                          )}
                        </Space>
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            )}
          </Card>
        </>
      )}

      <Modal
        title="新建手术病例"
        open={caseFormVisible}
        onOk={handleCreateCase}
        onCancel={() => {
          setCaseFormVisible(false)
          patientForm.resetFields()
          caseForm.resetFields()
        }}
        width={600}
        okText="创建病例"
      >
        <Divider orientation="left">患者信息</Divider>
        <Form form={patientForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="患者姓名"
                rules={[{ required: true, message: '请输入患者姓名' }]}
              >
                <Input placeholder="请输入患者姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="hospitalNumber"
                label="住院号"
                rules={[{ required: true, message: '请输入住院号' }]}
              >
                <Input placeholder="请输入住院号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="gender"
                label="性别"
                rules={[{ required: true, message: '请选择性别' }]}
              >
                <Select placeholder="请选择">
                  <Option value="male">男</Option>
                  <Option value="female">女</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="age"
                label="年龄"
                rules={[{ required: true, message: '请输入年龄' }]}
              >
                <InputNumber min={0} max={120} style={{ width: '100%' }} placeholder="岁" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="department" label="科室">
                <Select placeholder="请选择科室">
                  <Option value="心内科">心内科</Option>
                  <Option value="神经外科">神经外科</Option>
                  <Option value="血管外科">血管外科</Option>
                  <Option value="肿瘤科">肿瘤科</Option>
                  <Option value="放射科">放射介入科</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider orientation="left">手术信息</Divider>
        <Form form={caseForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="operatingRoom"
                label="手术间"
                rules={[{ required: true, message: '请选择手术间' }]}
              >
                <Select placeholder="请选择手术间">
                  {operatingRooms.map((or) => (
                    <Option key={or.id} value={or.name}>
                      {or.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="手术开始时间"
                rules={[{ required: true, message: '请选择时间' }]}
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  defaultValue={dayjs()}
                  format="YYYY-MM-DD HH:mm:ss"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="surgeryName"
            label="手术名称"
            rules={[{ required: true, message: '请输入手术名称' }]}
          >
            <Input placeholder="如：冠状动脉造影+支架植入术" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="surgeon"
                label="主刀医生"
                rules={[{ required: true, message: '请输入主刀医生' }]}
              >
                <Input placeholder="请输入主刀医生姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="assistantSurgeon" label="助手医生">
                <Input placeholder="请输入助手医生姓名" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={`批量标记阶段（已选 ${
          viewMode === 'batch' && selectedBatchIds.length > 0
            ? `${selectedBatchIds.length} 个批次 / 共 ${selectedMediaIds.length} 个`
            : selectedMediaIds.length + ' 个'
        }）`}
        open={batchStageVisible}
        onOk={handleConfirmBatchStageCommon}
        onCancel={() => setBatchStageVisible(false)}
        okText="确认标记"
        width={480}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">请选择要设置的手术阶段：</Text>
        </div>
        <Row gutter={[8, 8]}>
          {Object.entries(SurgicalStageLabels).map(([k, label]) => (
            <Col key={k} xs={12} sm={8}>
              <Button
                block
                type={batchStageValue === k ? 'primary' : 'default'}
                icon={<ScissorOutlined />}
                onClick={() => setBatchStageValue(k as SurgicalStage)}
              >
                {label}
              </Button>
            </Col>
          ))}
        </Row>
      </Modal>

      <Modal
        title={`批量移动设备（已选 ${
          viewMode === 'batch' && selectedBatchIds.length > 0
            ? `${selectedBatchIds.length} 个批次 / 共 ${selectedMediaIds.length} 个`
            : selectedMediaIds.length + ' 个'
        }）`}
        open={batchMoveDeviceVisible}
        onOk={handleConfirmBatchMoveDevice}
        onCancel={() => setBatchMoveDeviceVisible(false)}
        okText="确认移动"
        width={420}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">请选择目标设备：</Text>
        </div>
        <Row gutter={[8, 8]}>
          {(currentCase
            ? operatingRooms.find((or) => or.name === currentCase.operatingRoom)?.devices || []
            : []
          ).map((dev) => (
            <Col key={dev} xs={12} sm={8}>
              <Button
                block
                type={moveTargetDevice === dev ? 'primary' : 'default'}
                icon={<CameraOutlined />}
                onClick={() => setMoveTargetDevice(dev)}
              >
                {ImagingDeviceLabels[dev]}
              </Button>
            </Col>
          ))}
        </Row>
      </Modal>
    </div>
  )
}
