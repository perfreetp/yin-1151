import React, { useState, useRef } from 'react'
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
  Alert
} from 'antd'
import {
  CameraOutlined,
  UploadOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  FileImageOutlined,
  ScanOutlined,
  ScissorOutlined,
  SyncOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAppStore } from '../store'
import type {
  SurgicalStage,
  ImagingDevice,
  MediaType,
  MediaItem,
  Patient
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
    cases,
    checkCaseIntegrity
  } = useAppStore()

  const currentCase = getCurrentCase()

  const [patientForm] = Form.useForm<PatientFormData>()
  const [caseForm] = Form.useForm<CaseFormData>()

  const activeCases = cases.filter((c) => c.status !== 'archived')

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
    if (!selectedDevice) {
      message.warning('请先选择设备')
      return
    }

    if (!files) return

    Array.from(files).forEach((file) => {
      let mediaType: MediaType = 'image'
      if (file.type.startsWith('video/')) {
        mediaType = 'video'
      } else if (file.name.toLowerCase().includes('sequence') || file.name.toLowerCase().includes('seq')) {
        mediaType = 'sequence'
      }

      addMediaItem(currentCase.id, {
        device: selectedDevice,
        type: mediaType,
        fileName: file.name,
        filePath: file.name,
        fileSize: file.size,
        capturedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        stage: selectedStage || undefined
      })
    })

    message.success(`成功导入 ${files.length} 个文件`)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const integrityCheck = currentCase ? checkCaseIntegrity(currentCase.id) : null

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
                    disabled={!selectedDevice}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    一键导入{selectedDevice ? ImagingDeviceLabels[selectedDevice] : ''}资料
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
                  <Space>
                    <Text type="secondary">
                      已导入 <Text strong>{currentCase.mediaItems.length}</Text> 个文件
                    </Text>
                    {selectedStage && (
                      <Tag color="green">当前阶段: {SurgicalStageLabels[selectedStage]}</Tag>
                    )}
                  </Space>
                </Col>
                <Col>
                  <Button
                    onClick={() => {
                      const mockFiles = [
                        { name: 'DSA_img_001.jpg', size: 2048000 },
                        { name: 'DSA_img_002.jpg', size: 1890000 },
                        { name: 'angio_seq_001.mp4', size: 15728640 }
                      ]
                      if (!selectedDevice) {
                        message.warning('请先选择设备')
                        return
                      }
                      mockFiles.forEach((file) => {
                        let mediaType: MediaType = 'image'
                        if (file.name.includes('seq')) mediaType = 'sequence'
                        addMediaItem(currentCase.id, {
                          device: selectedDevice,
                          type: mediaType,
                          fileName: file.name,
                          filePath: file.name,
                          fileSize: file.size,
                          capturedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                          stage: selectedStage || undefined
                        })
                      })
                      message.success('模拟导入 3 个文件')
                    }}
                  >
                    模拟导入
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>

          <Card
            size="small"
            title={
              <Space>
                <Text>影像资料列表</Text>
                <Tag color="blue">{currentCase.mediaItems.length} 个文件</Tag>
              </Space>
            }
            style={{ flex: 1, overflow: 'auto' }}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              dataSource={currentCase.mediaItems}
              columns={mediaColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 300 }}
            />
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
    </div>
  )
}
