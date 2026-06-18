import React, { useState, useEffect, useRef } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Tag,
  Space,
  Form,
  Input,
  InputNumber,
  Select,
  AutoComplete,
  Modal,
  message,
  Divider,
  Typography,
  Alert,
  Descriptions,
  Checkbox,
  Statistic,
  Empty,
  Steps
} from 'antd'
import {
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  UserOutlined,
  TeamOutlined,
  ExperimentOutlined,
  UndoOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store'
import type { SupplyItem, MediaItem, SurgicalStage, VerificationRecord } from '../types'
import { SurgicalStageLabels, ArchiveStatusLabels, VerifierRoleLabels } from '../types'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

const NURSE_SUGGESTIONS = ['护士小李', '护士小张', '护士小王', '护士小陈', '护士小刘']

interface SupplyFormData {
  name: string
  batchNumber: string
  quantity: number
  unit: string
  manufacturer?: string
}

interface ContrastFormData {
  name: string
  dosage: number
  unit: string
  batchNumber?: string
}

export const CaseVerification: React.FC = () => {
  const [supplyModalVisible, setSupplyModalVisible] = useState(false)
  const [contrastModalVisible, setContrastModalVisible] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [editingSupply, setEditingSupply] = useState<SupplyItem | null>(null)
  const [secondVerifierName, setSecondVerifierName] = useState('')

  const [supplyForm] = Form.useForm<SupplyFormData>()
  const [contrastForm] = Form.useForm<ContrastFormData>()

  const suppliesCardRef = useRef<HTMLDivElement>(null)
  const contrastCardRef = useRef<HTMLDivElement>(null)
  const verificationCardRef = useRef<HTMLDivElement>(null)
  const [highlightCard, setHighlightCard] = useState<string | null>(null)

  const {
    cases,
    currentUser,
    addSupplyItem,
    updateSupplyItem,
    removeSupplyItem,
    updateContrastAgent,
    updateCase,
    verifyCase,
    resetVerification,
    getVerificationInfo,
    checkCaseIntegrity,
    navigationContext,
    clearNavigationContext,
    setCurrentCase
  } = useAppStore()

  useEffect(() => {
    if (navigationContext?.caseId && navigationContext.caseId !== selectedCaseId) {
      setSelectedCaseId(navigationContext.caseId)
      setCurrentCase(navigationContext.caseId)
    }
    if (navigationContext?.highlightCard) {
      setHighlightCard(navigationContext.highlightCard)
      const map: Record<string, React.RefObject<HTMLDivElement>> = {
        supplies: suppliesCardRef,
        contrast_agent: contrastCardRef,
        dual_signature: verificationCardRef
      }
      const ref = map[navigationContext.highlightCard]
      if (ref?.current) {
        setTimeout(() => {
          ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 200)
      }
      setTimeout(() => {
        setHighlightCard(null)
        clearNavigationContext()
      }, 3000)
    }
  }, [navigationContext])

  const pendingCases = cases.filter((c) => c.status !== 'archived')
  const selectedCase = cases.find((c) => c.id === selectedCaseId)
  const integrityCheck = selectedCase ? checkCaseIntegrity(selectedCase.id) : null
  const verificationInfo = selectedCase ? getVerificationInfo(selectedCase.id) : null

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId)
    setSecondVerifierName('')
  }

  const handleFirstVerify = () => {
    if (!selectedCase) return
    verifyCase(selectedCase.id, currentUser, 'technician')
    message.success(`第一核对人（技师）${currentUser} 已确认核对`)
  }

  const handleSecondVerify = () => {
    if (!selectedCase) return
    const name = secondVerifierName.trim()
    if (!name) {
      message.warning('请录入或选择第二位核对人姓名')
      return
    }
    if (verificationInfo?.signedTechnician?.verifier === name) {
      message.warning('第二位核对人不能与第一人相同')
      return
    }
    verifyCase(selectedCase.id, name, 'nurse')
    setSecondVerifierName('')
    message.success(`第二核对人（巡回护士）${name} 已确认核对，病例状态变更为“已核对”`)
  }

  const handleResetVerification = () => {
    if (!selectedCase) return
    Modal.confirm({
      title: '重置核对记录',
      content: '将清除当前双人核对记录，病例状态恢复为“待核对”。是否继续？',
      okText: '重置',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        resetVerification(selectedCase.id)
        setSecondVerifierName('')
        message.success('已重置核对记录')
      }
    })
  }

  const handleAddSupply = () => {
    setEditingSupply(null)
    supplyForm.resetFields()
    setSupplyModalVisible(true)
  }

  const handleEditSupply = (supply: SupplyItem) => {
    setEditingSupply(supply)
    supplyForm.setFieldsValue({
      name: supply.name,
      batchNumber: supply.batchNumber,
      quantity: supply.quantity,
      unit: supply.unit,
      manufacturer: supply.manufacturer
    })
    setSupplyModalVisible(true)
  }

  const handleSaveSupply = async () => {
    if (!selectedCase) return

    try {
      const values = await supplyForm.validateFields()
      if (editingSupply) {
        updateSupplyItem(selectedCase.id, editingSupply.id, values)
        message.success('耗材信息已更新')
      } else {
        addSupplyItem(selectedCase.id, values)
        message.success('耗材已添加')
      }
      setSupplyModalVisible(false)
      supplyForm.resetFields()
    } catch {
      message.error('请填写完整信息')
    }
  }

  const handleSaveContrast = async () => {
    if (!selectedCase) return

    try {
      const values = await contrastForm.validateFields()
      updateContrastAgent(selectedCase.id, values)
      message.success('造影剂信息已保存')
      setContrastModalVisible(false)
      contrastForm.resetFields()
    } catch {
      message.error('请填写完整信息')
    }
  }

  const handleSaveNotes = (notes: string) => {
    if (!selectedCase) return
    updateCase(selectedCase.id, { notes })
    message.success('备注已保存')
  }

  const supplyColumns = [
    {
      title: '耗材名称',
      dataIndex: 'name',
      key: 'name',
      width: 180
    },
    {
      title: '批号',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 160
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (val: number, record: SupplyItem) => `${val} ${record.unit}`
    },
    {
      title: '生产厂家',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: SupplyItem) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEditSupply(record)}>
            编辑
          </Button>
          <Button
            type="link"
            danger
            size="small"
            onClick={() => selectedCase && removeSupplyItem(selectedCase.id, record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  const mediaByStage = selectedCase
    ? selectedCase.mediaItems.reduce((acc, item) => {
        const stage = item.stage || 'unstaged'
        if (!acc[stage]) acc[stage] = []
        acc[stage].push(item)
        return acc
      }, {} as Record<string, MediaItem[]>)
    : {}

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          病例核对
        </Title>
      </div>

      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
        <Col span={6} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            size="small"
            title={
              <Space>
                <FileTextOutlined />
                <Text>待核对病例</Text>
                <Tag color="orange">{pendingCases.length}</Tag>
              </Space>
            }
            style={{ flex: 1, overflow: 'auto' }}
            bodyStyle={{ padding: 8 }}
          >
            {pendingCases.length === 0 ? (
              <Empty description="暂无待核对病例" />
            ) : (
              <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                {pendingCases.map((c) => (
                  <Card
                    key={c.id}
                    size="small"
                    hoverable
                    onClick={() => handleSelectCase(c.id)}
                    style={{
                      borderColor: selectedCaseId === c.id ? '#1677ff' : undefined,
                      backgroundColor: selectedCaseId === c.id ? '#e6f4ff' : undefined
                    }}
                  >
                    <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                      <Space>
                        <Text strong>{c.patient.name}</Text>
                        <Tag color={c.status === 'draft' ? 'orange' : 'green'}>
                          {ArchiveStatusLabels[c.status]}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {c.patient.hospitalNumber}
                      </Text>
                      <Text style={{ fontSize: 12 }} ellipsis>
                        {c.surgeryName}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {c.startTime}
                      </Text>
                      <div>
                        <Tag color="blue" style={{ margin: 0 }}>
                          {c.mediaItems.length} 个影像
                        </Tag>
                      </div>
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        <Col span={18} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!selectedCase ? (
            <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="请从左侧选择需要核对的病例" />
            </Card>
          ) : (
            <>
              {integrityCheck && (integrityCheck.errors.length > 0 || integrityCheck.warnings.length > 0) && (
                <Card size="small" style={{ marginBottom: 12 }}>
                  <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                    {integrityCheck.errors.map((err, idx) => (
                      <Alert key={idx} message={err} type="error" showIcon />
                    ))}
                    {integrityCheck.warnings.map((warn, idx) => (
                      <Alert key={idx} message={warn} type="warning" showIcon />
                    ))}
                  </Space>
                </Card>
              )}

              <Card
                size="small"
                title={
                  <Space>
                    <UserOutlined />
                    <Text>患者信息核对</Text>
                  </Space>
                }
                style={{ marginBottom: 12 }}
              >
                <Descriptions size="small" column={3} bordered>
                  <Descriptions.Item label="患者姓名" span={1}>
                    <Text strong style={{ fontSize: 16 }}>
                      {selectedCase.patient.name}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="住院号" span={1}>
                    <Text strong style={{ fontSize: 16 }}>
                      {selectedCase.patient.hospitalNumber}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="性别/年龄" span={1}>
                    {selectedCase.patient.gender === 'male' ? '男' : '女'} / {selectedCase.patient.age}岁
                  </Descriptions.Item>
                  <Descriptions.Item label="科室" span={1}>
                    {selectedCase.patient.department}
                  </Descriptions.Item>
                  <Descriptions.Item label="手术名称" span={2}>
                    <Text strong>{selectedCase.surgeryName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="术者" span={1}>
                    {selectedCase.surgeon}
                    {selectedCase.assistantSurgeon && ` / ${selectedCase.assistantSurgeon}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="手术间" span={1}>
                    {selectedCase.operatingRoom}
                  </Descriptions.Item>
                  <Descriptions.Item label="开始时间" span={1}>
                    {selectedCase.startTime}
                  </Descriptions.Item>
                </Descriptions>

                <div style={{ marginTop: 12 }}>
                  <Space>
                    <Checkbox checked={!!verificationInfo?.signedTechnician} disabled>
                      技师已核对
                    </Checkbox>
                    <Checkbox checked={!!verificationInfo?.signedNurse} disabled>
                      巡回护士已核对
                    </Checkbox>
                    {verificationInfo && !verificationInfo.isComplete && (
                      <Text type="warning" style={{ fontSize: 12 }}>
                        （还差 {verificationInfo.missingCount} 位：{verificationInfo.missingRoles.join('、')}）
                      </Text>
                    )}
                    {verificationInfo?.isComplete && (
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        双人核对完成
                      </Tag>
                    )}
                  </Space>
                </div>
              </Card>

              <Card
                size="small"
                title={
                  <Space>
                    <ExperimentOutlined />
                    <Text>影像资料核对</Text>
                    <Tag color="blue">{selectedCase.mediaItems.length} 个文件</Tag>
                  </Space>
                }
                style={{ marginBottom: 12 }}
              >
                {Object.keys(mediaByStage).length === 0 ? (
                  <Empty description="暂无影像资料" image={null} />
                ) : (
                  <Row gutter={[12, 12]}>
                    {Object.entries(mediaByStage).map(([stage, items]) => (
                      <Col xs={24} sm={12} key={stage}>
                        <Card
                          size="small"
                          title={
                            <Space>
                              <Tag color={stage === 'unstaged' ? 'red' : 'green'}>
                                {stage === 'unstaged' ? '未标记' : SurgicalStageLabels[stage as SurgicalStage]}
                              </Tag>
                              <Text type="secondary">{items.length} 个</Text>
                            </Space>
                          }
                          bodyStyle={{ padding: 8, maxHeight: 120, overflow: 'auto' }}
                        >
                          <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                            {items.map((item) => (
                              <div key={item.id} style={{ fontSize: 12 }}>
                                <Text type="secondary">[{item.device.toUpperCase()}]</Text> {item.fileName}
                              </div>
                            ))}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Card>

              <Card
                ref={suppliesCardRef}
                size="small"
                title={
                  <Space>
                    <TeamOutlined />
                    <Text>耗材登记</Text>
                    <Tag color="cyan">{selectedCase.supplies.length} 项</Tag>
                  </Space>
                }
                extra={
                  <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddSupply}>
                    添加耗材
                  </Button>
                }
                style={{
                  marginBottom: 12,
                  boxShadow: highlightCard === 'supplies' ? '0 0 0 3px #1677ff' : undefined,
                  transition: 'box-shadow 0.3s'
                }}
                bodyStyle={{ padding: 0 }}
              >
                <Table
                  dataSource={selectedCase.supplies}
                  columns={supplyColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              </Card>

              <Card
                ref={contrastCardRef}
                size="small"
                title={
                  <Space>
                    <ExperimentOutlined />
                    <Text>造影剂使用</Text>
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      if (selectedCase.contrastAgent) {
                        contrastForm.setFieldsValue(selectedCase.contrastAgent)
                      }
                      setContrastModalVisible(true)
                    }}
                  >
                    {selectedCase.contrastAgent ? '编辑' : '登记'}
                  </Button>
                }
                style={{
                  marginBottom: 12,
                  boxShadow: highlightCard === 'contrast_agent' ? '0 0 0 3px #1677ff' : undefined,
                  transition: 'box-shadow 0.3s'
                }}
              >
                {selectedCase.contrastAgent ? (
                  <Row gutter={24}>
                    <Col>
                      <Statistic title="造影剂名称" value={selectedCase.contrastAgent.name} />
                    </Col>
                    <Col>
                      <Statistic
                        title="用量"
                        value={selectedCase.contrastAgent.dosage}
                        suffix={selectedCase.contrastAgent.unit}
                      />
                    </Col>
                    {selectedCase.contrastAgent.batchNumber && (
                      <Col>
                        <Statistic title="批号" value={selectedCase.contrastAgent.batchNumber} />
                      </Col>
                    )}
                  </Row>
                ) : (
                  <Text type="secondary">暂未登记造影剂使用信息</Text>
                )}
              </Card>

              <Card
                size="small"
                title={
                  <Space>
                    <FileTextOutlined />
                    <Text>手术备注</Text>
                  </Space>
                }
                style={{ marginBottom: 12 }}
              >
                <TextArea
                  rows={2}
                  placeholder="请输入关键备注信息，如术中特殊情况、患者反应等..."
                  defaultValue={selectedCase.notes}
                  onBlur={(e) => handleSaveNotes(e.target.value)}
                />
              </Card>

              <Card
                ref={verificationCardRef}
                size="small"
                title={
                  <Space>
                    <SafetyCertificateOutlined />
                    <Text>双人核对</Text>
                    {verificationInfo?.isComplete ? (
                      <Tag color="green" icon={<CheckCircleOutlined />}>
                        已完成
                      </Tag>
                    ) : (
                      <Tag color="orange">进行中</Tag>
                    )}
                  </Space>
                }
                extra={
                  verificationInfo &&
                  !verificationInfo.isComplete &&
                  verificationInfo.count > 0 &&
                  selectedCase.status !== 'archived' ? (
                    <Button
                      size="small"
                      type="link"
                      danger
                      icon={<UndoOutlined />}
                      onClick={handleResetVerification}
                    >
                      重置核对
                    </Button>
                  ) : null
                }
                style={{
                  boxShadow: highlightCard === 'dual_signature' ? '0 0 0 3px #1677ff' : undefined,
                  transition: 'box-shadow 0.3s'
                }}
              >
                <Steps
                  size="small"
                  current={verificationInfo?.count || 0}
                  style={{ marginBottom: 16 }}
                  items={[
                    {
                      title: '技师确认',
                      description: verificationInfo?.signedTechnician
                        ? `${verificationInfo.signedTechnician.verifier} · ${verificationInfo.signedTechnician.time}`
                        : '待确认'
                    },
                    {
                      title: '巡回护士确认',
                      description: verificationInfo?.signedNurse
                        ? `${verificationInfo.signedNurse.verifier} · ${verificationInfo.signedNurse.time}`
                        : '待确认'
                    }
                  ]}
                />

                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  {verificationInfo?.records.length === 0 && (
                    <Alert
                      type="info"
                      showIcon
                      message="请第一核对人（技师）确认"
                      description={`当前登录技师：${currentUser}。确认后将进入第二核对人（巡回护士）签名环节。`}
                    />
                  )}

                  {verificationInfo &&
                    verificationInfo.count === 1 &&
                    !verificationInfo.isComplete && (
                      <Alert
                        type="warning"
                        showIcon
                        message="技师已确认，请录入第二位核对人（巡回护士）"
                        description={
                          <span>
                            已确认：{verificationInfo.records[0].verifier}（技师）于{' '}
                            {verificationInfo.records[0].time}。请由巡回护士录入或选择本人姓名后确认。
                          </span>
                        }
                      />
                    )}

                  {verificationInfo?.isComplete && (
                    <Alert
                      type="success"
                      showIcon
                      message="双人核对已完成，病例状态已变更为“已核对”"
                      description={
                        <span>
                          技师：{verificationInfo.signedTechnician?.verifier}（
                          {verificationInfo.signedTechnician?.time}）；巡回护士：
                          {verificationInfo.signedNurse?.verifier}（{verificationInfo.signedNurse?.time}）
                        </span>
                      }
                    />
                  )}

                  {verificationInfo?.records && verificationInfo.records.length > 0 && (
                    <Row gutter={[8, 8]}>
                      {verificationInfo.records.map((r: VerificationRecord) => (
                        <Col key={r.id}>
                          <Tag color="green" icon={<CheckCircleOutlined />} style={{ padding: '4px 8px' }}>
                            {VerifierRoleLabels[r.role]}：{r.verifier} · {r.time}
                          </Tag>
                        </Col>
                      ))}
                    </Row>
                  )}

                  {!verificationInfo?.isComplete && selectedCase.status !== 'archived' && (
                    <Row gutter={16} align="middle">
                      {verificationInfo?.count === 0 && (
                        <Col>
                          <Button
                            type="primary"
                            size="large"
                            icon={<CheckCircleOutlined />}
                            onClick={handleFirstVerify}
                            disabled={!!integrityCheck && integrityCheck.errors.length > 0}
                          >
                            {currentUser} 确认核对（技师）
                          </Button>
                          {integrityCheck && integrityCheck.errors.length > 0 && (
                            <Text type="danger" style={{ marginLeft: 12, fontSize: 12 }}>
                              存在错误项，无法核对
                            </Text>
                          )}
                        </Col>
                      )}
                      {verificationInfo?.count === 1 && (
                        <>
                          <Col flex="320px">
                            <AutoComplete
                              value={secondVerifierName}
                              options={NURSE_SUGGESTIONS.map((n) => ({ value: n }))}
                              style={{ width: '100%' }}
                              placeholder="请录入或选择第二位核对人姓名（巡回护士）"
                              filterOption={(input, option) =>
                                (option?.value ?? '').includes(input)
                              }
                              onChange={(val) => setSecondVerifierName(val)}
                            />
                          </Col>
                          <Col>
                            <Button
                              type="primary"
                              size="large"
                              icon={<CheckCircleOutlined />}
                              onClick={handleSecondVerify}
                              disabled={!secondVerifierName.trim()}
                            >
                              巡回护士确认核对
                            </Button>
                          </Col>
                        </>
                      )}
                    </Row>
                  )}
                </Space>
              </Card>
            </>
          )}
        </Col>
      </Row>

      <Modal
        title={editingSupply ? '编辑耗材' : '添加耗材'}
        open={supplyModalVisible}
        onOk={handleSaveSupply}
        onCancel={() => setSupplyModalVisible(false)}
        width={500}
      >
        <Form form={supplyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="耗材名称"
                rules={[{ required: true, message: '请输入耗材名称' }]}
              >
                <Select
                  placeholder="请选择或输入"
                  mode="tags"
                  tokenSeparators={[',']}
                  options={[
                    { value: '冠脉支架' },
                    { value: '球囊导管' },
                    { value: '导丝' },
                    { value: '鞘管' },
                    { value: '造影导管' },
                    { value: '封堵器' },
                    { value: '弹簧圈' },
                    { value: '栓塞微粒' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="batchNumber"
                label="批号"
                rules={[{ required: true, message: '请输入批号' }]}
              >
                <Input placeholder="如 ST20260601" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="数量"
                rules={[{ required: true, message: '请输入数量' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit"
                label="单位"
                rules={[{ required: true, message: '请选择单位' }]}
              >
                <Select placeholder="请选择">
                  <Option value="个">个</Option>
                  <Option value="根">根</Option>
                  <Option value="套">套</Option>
                  <Option value="瓶">瓶</Option>
                  <Option value="支">支</Option>
                  <Option value="包">包</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="manufacturer" label="生产厂家">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="造影剂登记"
        open={contrastModalVisible}
        onOk={handleSaveContrast}
        onCancel={() => setContrastModalVisible(false)}
        width={500}
      >
        <Form form={contrastForm} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="造影剂名称"
                rules={[{ required: true, message: '请选择造影剂' }]}
              >
                <Select placeholder="请选择">
                  <Option value="碘海醇">碘海醇</Option>
                  <Option value="碘克沙醇">碘克沙醇</Option>
                  <Option value="碘佛醇">碘佛醇</Option>
                  <Option value="碘普罗胺">碘普罗胺</Option>
                  <Option value="钆喷酸葡胺">钆喷酸葡胺</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="dosage"
                label="用量"
                rules={[{ required: true, message: '请输入用量' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="ml" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="unit"
                label="单位"
                initialValue="ml"
                rules={[{ required: true, message: '请选择单位' }]}
              >
                <Select placeholder="请选择">
                  <Option value="ml">ml</Option>
                  <Option value="mg">mg</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="batchNumber" label="批号">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
