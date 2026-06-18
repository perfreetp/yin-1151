import React, { useState, useEffect } from 'react'
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
  Select,
  DatePicker,
  Modal,
  message,
  Typography,
  Alert,
  Descriptions,
  Statistic,
  Empty,
  Drawer,
  Timeline,
  Tabs,
  Badge,
  Divider,
  Progress,
  List
} from 'antd'
import {
  SearchOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  HistoryOutlined,
  FolderOpenOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  SafetyOutlined,
  CheckSquareOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAppStore } from '../store'
import type {
  SurgicalCase,
  SearchFilters,
  ArchiveStatus,
  MediaItem,
  SupplyItem,
  QualityCheckItem,
  SurgicalStage
} from '../types'
import {
  SurgicalStageLabels,
  ImagingDeviceLabels,
  MediaTypeLabels,
  ArchiveStatusLabels,
  VerifierRoleLabels
} from '../types'
import { ArchiveHandoverModal } from './ArchiveHandoverModal'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker
const { TabPane } = Tabs

interface SearchFormData {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs]
  department?: string
  surgeon?: string
  patientName?: string
  hospitalNumber?: string
  status?: ArchiveStatus
}

export const ArchiveList: React.FC = () => {
  const [detailVisible, setDetailVisible] = useState(false)
  const [handoverVisible, setHandoverVisible] = useState(false)
  const [handoverCaseId, setHandoverCaseId] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState<SurgicalCase | null>(null)
  const [archiveConfirmVisible, setArchiveConfirmVisible] = useState(false)
  const [batchResultVisible, setBatchResultVisible] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [activeDetailTab, setActiveDetailTab] = useState('basic')
  const [searchForm] = Form.useForm<SearchFormData>()
  const [batchResult, setBatchResult] = useState<ReturnType<
    ReturnType<typeof useAppStore>['batchArchiveCases']
  > | null>(null)

  const {
    cases,
    archiveLogs,
    currentUser,
    searchFilters,
    setSearchFilters,
    searchCases,
    checkCaseIntegrity,
    getVerificationInfo,
    archiveCase,
    getQualityCheckItems,
    batchArchiveCases,
    setCurrentCase,
    navigationContext,
    clearNavigationContext
  } = useAppStore()

  const filteredCases = searchCases(searchFilters)

  // 处理从任务中心等外部跳转过来，自动打开对应病例详情抽屉并切到指定页签
  useEffect(() => {
    if (navigationContext?.caseId && navigationContext?.openArchiveDetail) {
      const c = cases.find((x) => x.id === navigationContext.caseId)
      if (c) {
        setSelectedCase(c)
        setDetailVisible(true)
        if (navigationContext.openDetailTab) {
          setActiveDetailTab(navigationContext.openDetailTab)
        }
      }
      // 消费完立即清除，避免切换标签时又重新触发
      setTimeout(() => clearNavigationContext(), 500)
    }
  }, [navigationContext])

  const departments = [...new Set(cases.map((c) => c.patient.department))]
  const surgeons = [...new Set(cases.map((c) => c.surgeon))]

  const handleSearch = (values: SearchFormData) => {
    const filters: SearchFilters = {}
    if (values.dateRange) {
      filters.startDate = values.dateRange[0].format('YYYY-MM-DD')
      filters.endDate = values.dateRange[1].format('YYYY-MM-DD')
    }
    if (values.department) filters.department = values.department
    if (values.surgeon) filters.surgeon = values.surgeon
    if (values.patientName) filters.patientName = values.patientName
    if (values.hospitalNumber) filters.hospitalNumber = values.hospitalNumber
    if (values.status) filters.status = values.status

    setSearchFilters(filters)
  }

  const handleReset = () => {
    searchForm.resetFields()
    setSearchFilters({})
  }

  const handleViewDetail = (record: SurgicalCase) => {
    setSelectedCase(record)
    setDetailVisible(true)
  }

  const handleArchiveClick = (record: SurgicalCase) => {
    setSelectedCase(record)
    setArchiveConfirmVisible(true)
  }

  const handleConfirmArchive = () => {
    if (!selectedCase) return

    if (!verificationInfo?.isComplete) {
      message.error('病例尚未完成双人核对，无法归档')
      return
    }

    const result = archiveCase(selectedCase.id, currentUser)
    if (result.success) {
      message.success('归档成功')
      if (result.warnings.length > 0) {
        Modal.warning({
          title: '归档完成，但有以下提醒',
          content: (
            <Space orientation="vertical">
              {result.warnings.map((w, idx) => (
                <Alert key={idx} message={w} type="warning" showIcon />
              ))}
            </Space>
          )
        })
      }
    } else {
      Modal.error({
        title: '归档失败，请修正以下问题',
        content: (
          <Space orientation="vertical">
            {result.warnings.map((w, idx) => (
              <Alert key={idx} message={w} type="error" showIcon />
            ))}
          </Space>
        )
      })
    }
    setArchiveConfirmVisible(false)
  }

  const integrityCheck = selectedCase ? checkCaseIntegrity(selectedCase.id) : null
  const verificationInfo = selectedCase ? getVerificationInfo(selectedCase.id) : null
  const qualityCheckItems = selectedCase ? getQualityCheckItems(selectedCase.id) : []
  const canArchive = !!verificationInfo?.isComplete && selectedCase?.status !== 'archived'
  const caseLogs = selectedCase
    ? archiveLogs.filter((l) => l.caseId === selectedCase.id).reverse()
    : []

  const isCaseArchivable = (c: SurgicalCase) => {
    const info = getVerificationInfo(c.id)
    const ic = checkCaseIntegrity(c.id)
    return info.isComplete && ic.errors.length === 0 && c.status !== 'archived'
  }

  const jumpToFix = (item: QualityCheckItem, targetCase?: SurgicalCase) => {
    const c = targetCase || selectedCase
    if (!item.targetWindow || !c) return
    // 先关掉所有弹窗，避免跳转后界面还被 Modal 遮挡
    setArchiveConfirmVisible(false)
    setDetailVisible(false)
    const targetTab = item.targetWindow === 'collection'
      ? 'collection'
      : item.targetWindow === 'verification'
      ? 'verification'
      : 'archive'
    const highlightMap: Record<string, NavigationContext['highlightCard']> = {
      patient_info: 'patient_info',
      imaging_stage: 'imaging_stage',
      supplies: 'supplies',
      contrast_agent: 'contrast_agent',
      dual_signature: 'dual_signature'
    }
    const hc = highlightMap[item.key]
    if (!hc) {
      console.warn('[jumpToFix] 未知的质控项 key:', item.key)
    }
    // 同步切换当前病例，避免过去后选中的是另一个
    setSelectedCase(c)
    navigateTo(targetTab, {
      fromTab: 'archive',
      caseId: c.id,
      highlightCard: hc,
      scrollTo: item.key
    })
  }

  const handleBatchArchive = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先勾选要批量归档的病例（仅已双人核对且无关键错误者可勾选）')
      return
    }
    Modal.confirm({
      title: '批量归档确认',
      content: `确认归档已勾选的 ${selectedRowKeys.length} 例病例吗？每例会独立判断，失败不影响其他。归档后可在「归档任务中心」追溯。`,
      okText: '开始批量归档',
      cancelText: '取消',
      onOk: () => {
        const result = batchArchiveCases(
          selectedRowKeys.map((k) => k as string),
          currentUser
        )
        setBatchResult(result)
        setBatchResultVisible(true)
        setSelectedRowKeys([])
        const total = result.success.length + result.failed.length
        message.success(
          `批量归档完成：成功 ${result.success.length} 例 / 失败 ${result.failed.length} 例 / 共 ${total} 例（任务号已保存，可前往归档任务中心查看）`
        )
      }
    })
  }

  const getStatusColor = (status: ArchiveStatus) => {
    const colors: Record<ArchiveStatus, string> = {
      draft: 'orange',
      verified: 'blue',
      archived: 'green'
    }
    return colors[status]
  }

  const stats = {
    total: cases.length,
    draft: cases.filter((c) => c.status === 'draft').length,
    verified: cases.filter((c) => c.status === 'verified').length,
    archived: cases.filter((c) => c.status === 'archived').length,
    today: cases.filter((c) => dayjs(c.startTime).isSame(dayjs(), 'day')).length
  }

  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      fixed: 'left' as const,
      render: (status: ArchiveStatus) => (
        <Tag color={getStatusColor(status)}>{ArchiveStatusLabels[status]}</Tag>
      )
    },
    {
      title: '患者姓名',
      dataIndex: ['patient', 'name'],
      key: 'patientName',
      width: 100
    },
    {
      title: '住院号',
      dataIndex: ['patient', 'hospitalNumber'],
      key: 'hospitalNumber',
      width: 120
    },
    {
      title: '科室',
      dataIndex: ['patient', 'department'],
      key: 'department',
      width: 100
    },
    {
      title: '手术名称',
      dataIndex: 'surgeryName',
      key: 'surgeryName',
      ellipsis: true,
      width: 200
    },
    {
      title: '术者',
      dataIndex: 'surgeon',
      key: 'surgeon',
      width: 100
    },
    {
      title: '手术间',
      dataIndex: 'operatingRoom',
      key: 'operatingRoom',
      width: 120
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160
    },
    {
      title: '影像资料',
      key: 'mediaCount',
      width: 90,
      render: (_: unknown, record: SurgicalCase) => (
        <Tag color="blue">{record.mediaItems.length}</Tag>
      )
    },
    {
      title: '完整性',
      key: 'integrity',
      width: 100,
      render: (_: unknown, record: SurgicalCase) => {
        const check = checkCaseIntegrity(record.id)
        if (check.errors.length > 0) {
          return (
            <Badge status="error" text={`${check.errors.length}项错误`} />
          )
        }
        if (check.warnings.length > 0) {
          return (
            <Badge status="warning" text={`${check.warnings.length}项提醒`} />
          )
        }
        return <Badge status="success" text="完整" />
      }
    },
    {
      title: '归档时间',
      dataIndex: 'archivedAt',
      key: 'archivedAt',
      width: 160,
      render: (val?: string) => val || '-'
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 180,
      render: (_: unknown, record: SurgicalCase) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status !== 'archived' && (
            <Button
              type="primary"
              size="small"
              icon={<InboxOutlined />}
              onClick={() => handleArchiveClick(record)}
            >
              归档
            </Button>
          )}
          {record.status === 'archived' && (
            <Button size="small" icon={<DownloadOutlined />}>
              导出
            </Button>
          )}
        </Space>
      )
    }
  ]

  const mediaColumns = [
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      width: 80,
      render: (d: string) => ImagingDeviceLabels[d as keyof typeof ImagingDeviceLabels]
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (t: string) => MediaTypeLabels[t as keyof typeof MediaTypeLabels]
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true
    },
    {
      title: '手术阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 100,
      render: (s: string | null) =>
        s ? SurgicalStageLabels[s as keyof typeof SurgicalStageLabels] : <Tag color="red">未标记</Tag>
    },
    {
      title: '拍摄时间',
      dataIndex: 'capturedAt',
      key: 'capturedAt',
      width: 160
    }
  ]

  const supplyColumns = [
    {
      title: '耗材名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '批号',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 140
    },
    {
      title: '数量',
      key: 'quantity',
      width: 100,
      render: (_: unknown, record: SupplyItem) => `${record.quantity} ${record.unit}`
    },
    {
      title: '生产厂家',
      dataIndex: 'manufacturer',
      key: 'manufacturer'
    }
  ]

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          归档列表
        </Title>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="今日手术" value={stats.today} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="待核对"
              value={stats.draft}
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已核对"
              value={stats.verified}
              valueStyle={{ color: '#1677ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已归档"
              value={stats.archived}
              valueStyle={{ color: '#52c41a' }}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="总计病例" value={stats.total} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline" onFinish={handleSearch}>
          <Form.Item name="dateRange" label="手术日期">
            <RangePicker style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="department" label="科室">
            <Select placeholder="全部" allowClear style={{ width: 140 }}>
              {departments.map((d) => (
                <Option key={d} value={d}>
                  {d}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="surgeon" label="术者">
            <Select placeholder="全部" allowClear style={{ width: 140 }} showSearch>
              {surgeons.map((s) => (
                <Option key={s} value={s}>
                  {s}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
              <Option value="draft">待核对</Option>
              <Option value="verified">已核对</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Form.Item>
          <Form.Item name="patientName" label="患者">
            <Input placeholder="姓名" style={{ width: 120 }} allowClear />
          </Form.Item>
          <Form.Item name="hospitalNumber" label="住院号">
            <Input placeholder="住院号" style={{ width: 140 }} allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        size="small"
        title={
          <Space wrap>
            <FolderOpenOutlined />
            <Text>病例列表</Text>
            <Tag color="blue">{filteredCases.length}</Tag>
            {selectedRowKeys.length > 0 && (
              <>
                <Tag color="gold">已选 {selectedRowKeys.length}</Tag>
                <Button type="primary" size="small" icon={<CheckSquareOutlined />} onClick={handleBatchArchive}>
                  批量归档
                </Button>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  清空勾选
                </Button>
              </>
            )}
            {selectedRowKeys.length === 0 && (
              <Tag color="cyan">提示：仅已双人核对且无关键错误的病例支持批量归档勾选</Tag>
            )}
          </Space>
        }
        style={{ flex: 1, overflow: 'auto' }}
        bodyStyle={{ padding: 0 }}
      >
        {filteredCases.length === 0 ? (
          <Empty description="暂无符合条件的病例" style={{ padding: 48 }} />
        ) : (
          <Table
            dataSource={filteredCases}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1400, y: 400 }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (record: SurgicalCase) => ({
                disabled: !isCaseArchivable(record)
              }),
              checkStrictly: true
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        )}
      </Card>

      <Drawer
        title="病例详情"
        placement="right"
        width={800}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          <Space>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => {
                if (selectedCase) {
                  setHandoverCaseId(selectedCase.id)
                  setHandoverVisible(true)
                }
              }}
            >
              交接单
            </Button>
            {selectedCase && selectedCase.status !== 'archived' && (
              <Button type="primary" icon={<InboxOutlined />} onClick={() => {
                setDetailVisible(false)
                handleArchiveClick(selectedCase)
              }}>
                归档
              </Button>
            )}
          </Space>
        }
      >
        {selectedCase && (
          <Tabs
            activeKey={activeDetailTab}
            onChange={setActiveDetailTab}
            defaultActiveKey="basic"
          >
            <TabPane tab="基本信息" key="basic">
              {integrityCheck && (integrityCheck.errors.length > 0 || integrityCheck.warnings.length > 0) && (
                <Space orientation="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
                  {integrityCheck.errors.map((err, idx) => (
                    <Alert key={idx} message={err} type="error" showIcon />
                  ))}
                  {integrityCheck.warnings.map((warn, idx) => (
                    <Alert key={idx} message={warn} type="warning" showIcon />
                  ))}
                </Space>
              )}

              <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="患者姓名" span={1}>
                  {selectedCase.patient.name}
                </Descriptions.Item>
                <Descriptions.Item label="住院号" span={1}>
                  {selectedCase.patient.hospitalNumber}
                </Descriptions.Item>
                <Descriptions.Item label="性别年龄" span={1}>
                  {selectedCase.patient.gender === 'male' ? '男' : '女'} / {selectedCase.patient.age}岁
                </Descriptions.Item>
                <Descriptions.Item label="科室" span={1}>
                  {selectedCase.patient.department}
                </Descriptions.Item>
                <Descriptions.Item label="手术名称" span={2}>
                  {selectedCase.surgeryName}
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
                <Descriptions.Item label="结束时间" span={1}>
                  {selectedCase.endTime || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="状态" span={1}>
                  <Tag color={getStatusColor(selectedCase.status)}>
                    {ArchiveStatusLabels[selectedCase.status]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="归档时间" span={1}>
                  {selectedCase.archivedAt || '-'}
                </Descriptions.Item>
              </Descriptions>

              {selectedCase.notes && (
                <Card size="small" title="手术备注" style={{ marginBottom: 16 }}>
                  {selectedCase.notes}
                </Card>
              )}

              {selectedCase.verificationRecords && selectedCase.verificationRecords.length > 0 && (
                <Card size="small" title="核对记录" style={{ marginBottom: 16 }}>
                  <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                    {selectedCase.verificationRecords.map((r) => (
                      <Space key={r.id} wrap>
                        <Tag color="green" icon={<CheckCircleOutlined />}>
                          {r.role === 'technician' ? '技师' : '巡回护士'}：{r.verifier}
                        </Tag>
                        <Text type="secondary">确认时间：{r.time}</Text>
                      </Space>
                    ))}
                    {verificationInfo?.isComplete ? (
                      <Text type="success">双人核对已完成（{selectedCase.verificationTime}）</Text>
                    ) : (
                      <Text type="warning">
                        核对未完成，还差 {verificationInfo?.missingCount} 位（{verificationInfo?.missingRoles.join('、')}）
                      </Text>
                    )}
                  </Space>
                </Card>
              )}
            </TabPane>

            <TabPane tab={`影像资料 (${selectedCase.mediaItems.length})`} key="media">
              <Table
                dataSource={selectedCase.mediaItems}
                columns={mediaColumns}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </TabPane>

            <TabPane tab={`耗材登记 (${selectedCase.supplies.length})`} key="supplies">
              {selectedCase.supplies.length === 0 ? (
                <Empty description="暂无耗材登记" />
              ) : (
                <Table
                  dataSource={selectedCase.supplies}
                  columns={supplyColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              )}

              {selectedCase.contrastAgent && (
                <>
                  <Divider orientation="left">造影剂使用</Divider>
                  <Row gutter={24}>
                    <Col>
                      <Statistic title="造影剂" value={selectedCase.contrastAgent.name} />
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
                </>
              )}
            </TabPane>

            <TabPane tab="操作日志" key="logs">
              {caseLogs.length === 0 ? (
                <Empty description="暂无操作日志" />
              ) : (
                <Timeline
                  items={caseLogs.map((log) => ({
                    color:
                      log.action === 'archive'
                        ? 'green'
                        : log.action === 'verify'
                        ? 'blue'
                        : log.action === 'import_media'
                        ? 'cyan'
                        : 'gray',
                    children: (
                      <Space orientation="vertical" size={0}>
                        <Text strong>{log.details}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {log.operator} · {log.timestamp}
                        </Text>
                      </Space>
                    )
                  }))}
                />
              )}
            </TabPane>

            <TabPane
              tab={
                <Space>
                  <SafetyOutlined />
                  归档质控
                  {selectedCase.qualityCheckSnapshot ? <Badge status="success" /> : null}
                </Space>
              }
              key="quality"
            >
              {selectedCase.qualityCheckSnapshot ? (
                <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                  <Card size="small" title="快照摘要">
                    <Row gutter={16}>
                      <Col span={6}>
                        <Statistic
                          title="通过项"
                          value={selectedCase.qualityCheckSnapshot.summary.passed}
                          suffix={`/ ${selectedCase.qualityCheckSnapshot.summary.total}`}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="错误项"
                          value={selectedCase.qualityCheckSnapshot.summary.errorCount}
                          valueStyle={{
                            color:
                              selectedCase.qualityCheckSnapshot.summary.errorCount > 0
                                ? '#cf1322'
                                : '#8c8c8c'
                          }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="提醒项"
                          value={selectedCase.qualityCheckSnapshot.summary.warningCount}
                          valueStyle={{
                            color:
                              selectedCase.qualityCheckSnapshot.summary.warningCount > 0
                                ? '#faad14'
                                : '#8c8c8c'
                          }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="检查时点"
                          value={selectedCase.qualityCheckSnapshot.createdAt}
                          valueStyle={{ fontSize: 13 }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={8}>
                        <Statistic
                          title="归档操作人"
                          value={selectedCase.qualityCheckSnapshot.operator}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="阶段未标记数量"
                          value={selectedCase.qualityCheckSnapshot.mediaUnstaged}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="耗材 / 造影剂"
                          value={`${selectedCase.qualityCheckSnapshot.suppliesCount} / ${
                            selectedCase.qualityCheckSnapshot.contrastAgentPresent ? '是' : '否'
                          }`}
                        />
                      </Col>
                    </Row>
                  </Card>

                  <Card size="small" title="检查项明细">
                    <List
                      dataSource={selectedCase.qualityCheckSnapshot.items}
                      renderItem={(item) => {
                        const colorMap: Record<QualityCheckItem['category'], string> = {
                          pass: 'green',
                          error: 'red',
                          warning: 'orange',
                          info: 'blue'
                        }
                        const iconMap: Record<QualityCheckItem['category'], React.ReactNode> = {
                          pass: <CheckCircleOutlined />,
                          error: <ExclamationCircleOutlined />,
                          warning: <WarningOutlined />,
                          info: <HistoryOutlined />
                        }
                        return (
                          <List.Item>
                            <List.Item.Meta
                              avatar={
                                <Tag icon={iconMap[item.category]} color={colorMap[item.category]}>
                                  {item.label}
                                </Tag>
                              }
                              title={
                                <Space>
                                  <Text strong>{item.passed ? '通过' : '未通过'}</Text>
                                  {item.messages.length === 1 ? (
                                    <Text type="secondary">{item.messages[0]}</Text>
                                  ) : null}
                                </Space>
                              }
                              description={
                                item.messages.length > 1 ? (
                                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {item.messages.map((m, i) => (
                                      <li key={i}>{m}</li>
                                    ))}
                                  </ul>
                                ) : null
                              }
                            />
                          </List.Item>
                        )
                      }}
                    />
                  </Card>

                  {Object.keys(selectedCase.qualityCheckSnapshot.mediaByStage).length > 0 && (
                    <Card size="small" title="影像阶段分布（归档时）">
                      <Row gutter={[8, 8]}>
                        {Object.entries(selectedCase.qualityCheckSnapshot.mediaByStage).map(
                          ([stage, count]) => (
                            <Col key={stage} xs={12} sm={8} md={6}>
                              <Tag
                                color={stage === 'unstaged' ? 'red' : 'green'}
                                style={{ width: '100%', textAlign: 'center', padding: '6px 0' }}
                              >
                                {stage === 'unstaged'
                                  ? '未标记'
                                  : SurgicalStageLabels[stage as SurgicalStage]}
                                ：{count} 个
                              </Tag>
                            </Col>
                          )
                        )}
                      </Row>
                    </Card>
                  )}
                </Space>
              ) : (
                <Empty
                  description={
                    <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                      <Text>当前病例尚未归档，无归档时点质控快照</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        在「归档弹窗」中可见实时质控清单；归档后将保存为快照供回看。
                      </Text>
                    </Space>
                  }
                />
              )}
            </TabPane>
          </Tabs>
        )}
      </Drawer>

      <Modal
        title="确认归档"
        open={archiveConfirmVisible}
        onOk={handleConfirmArchive}
        onCancel={() => setArchiveConfirmVisible(false)}
        okText="确认归档"
        okButtonProps={{ type: 'primary', disabled: !canArchive }}
        width={600}
      >
        {selectedCase && (
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="患者">{selectedCase.patient.name}</Descriptions.Item>
              <Descriptions.Item label="住院号">{selectedCase.patient.hospitalNumber}</Descriptions.Item>
              <Descriptions.Item label="手术" span={2}>
                {selectedCase.surgeryName}
              </Descriptions.Item>
              <Descriptions.Item label="术者">{selectedCase.surgeon}</Descriptions.Item>
              <Descriptions.Item label="影像资料">{selectedCase.mediaItems.length} 个</Descriptions.Item>
            </Descriptions>

            <Card
              size="small"
              title={
                <Space>
                  <SafetyOutlined />
                  <Text strong>归档质控清单</Text>
                  <Tag color="geekblue">
                    通过 {qualityCheckItems.filter((i) => i.passed).length} / {qualityCheckItems.length}
                  </Tag>
                </Space>
              }
              bodyStyle={{ padding: 0 }}
            >
              <List
                dataSource={qualityCheckItems}
                renderItem={(item) => {
                  const typeMap: Record<QualityCheckItem['category'], 'success' | 'error' | 'warning' | 'info'> = {
                    pass: 'success',
                    error: 'error',
                    warning: 'warning',
                    info: 'info'
                  }
                  const showJump =
                    !item.passed && (item.category === 'error' || item.category === 'warning')
                  return (
                    <List.Item
                      key={item.key}
                      actions={
                        showJump
                          ? [
                              <Button
                                key="jump"
                                type="link"
                                size="small"
                                icon={<EnvironmentOutlined />}
                                onClick={() => jumpToFix(item)}
                              >
                                定位修复
                              </Button>
                            ]
                          : undefined
                      }
                      style={{ padding: '8px 16px' }}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{ marginTop: 4 }}>
                            {item.category === 'pass' ? (
                              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                            ) : item.category === 'error' ? (
                              <ExclamationCircleOutlined style={{ color: '#cf1322', fontSize: 20 }} />
                            ) : item.category === 'warning' ? (
                              <WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />
                            ) : (
                              <HistoryOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                            )}
                          </div>
                        }
                        title={
                          <Space wrap>
                            <Tag
                              color={
                                item.category === 'pass'
                                  ? 'green'
                                  : item.category === 'error'
                                  ? 'red'
                                  : item.category === 'warning'
                                  ? 'orange'
                                  : 'blue'
                              }
                            >
                              {item.label}
                            </Tag>
                            <Text
                              type={
                                item.category === 'pass'
                                  ? 'success'
                                  : item.category === 'error'
                                  ? 'danger'
                                  : undefined
                              }
                              strong
                            >
                              {item.passed ? '通过' : '需关注'}
                            </Text>
                            {item.messages.length === 1 ? (
                              <Text type="secondary">{item.messages[0]}</Text>
                            ) : null}
                          </Space>
                        }
                        description={
                          item.messages.length > 1 ? (
                            <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                              {item.messages.map((m, i) => (
                                <Text key={i} type="secondary">
                                  • {m}
                                </Text>
                              ))}
                            </Space>
                          ) : null
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            </Card>

            {verificationInfo && !verificationInfo.isComplete && (
              <Alert
                type="error"
                showIcon
                message="病例尚未完成双人核对，无法归档"
                description={
                  <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                    <div>
                      已确认：
                      {verificationInfo.records.length > 0
                        ? verificationInfo.records
                            .map(
                              (r) =>
                                `${r.verifier}（${
                                  r.role === 'technician' ? '技师' : '巡回护士'
                                }，${r.time}）`
                            )
                            .join('；')
                        : '尚无任何人确认'}
                    </div>
                    <div style={{ color: '#cf1322' }}>
                      还差 {verificationInfo.missingCount} 位核对人确认：
                      {verificationInfo.missingRoles.join('、')}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      请前往「病例核对」完成双人签名后再进行归档。
                    </div>
                  </Space>
                }
              />
            )}

            {verificationInfo?.isComplete && (
              <Alert
                type="success"
                showIcon
                message="双人核对已完成，符合归档前置条件"
                description={
                  <span>
                    技师：{verificationInfo.signedTechnician?.verifier}（
                    {verificationInfo.signedTechnician?.time}）；巡回护士：
                    {verificationInfo.signedNurse?.verifier}（{verificationInfo.signedNurse?.time}）
                  </span>
                }
              />
            )}

            {integrityCheck && integrityCheck.errors.length > 0 && (
              <Alert
                message="存在以下错误，无法归档"
                type="error"
                showIcon
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {integrityCheck.errors.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                }
              />
            )}

            {integrityCheck &&
              integrityCheck.errors.length === 0 &&
              integrityCheck.warnings.length > 0 && (
                <Alert
                  message="存在以下提醒，仍可归档"
                  type="warning"
                  showIcon
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {integrityCheck.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  }
                />
              )}

            {integrityCheck &&
              integrityCheck.errors.length === 0 &&
              integrityCheck.warnings.length === 0 &&
              canArchive && (
                <Alert message="资料完整且双人核对已完成，可以归档" type="success" showIcon />
              )}

            <Text type="secondary">
              <HistoryOutlined /> 归档后将生成可追溯的归档记录，数据不可修改。
            </Text>
          </Space>
        )}
      </Modal>

      <Modal
        title={
          batchResult ? (
            <Space>
              <InboxOutlined />
              批量归档结果
              <Tag color="green">成功 {batchResult.success.length}</Tag>
              <Tag color="red">失败 {batchResult.failed.length}</Tag>
              {batchResult.warnings.length > 0 && (
                <Tag color="orange">有提醒 {batchResult.warnings.length}</Tag>
              )}
            </Space>
          ) : (
            '批量归档结果'
          )
        }
        open={batchResultVisible}
        onCancel={() => setBatchResultVisible(false)}
        footer={
          <Button type="primary" onClick={() => setBatchResultVisible(false)}>
            知道了
          </Button>
        }
        width={720}
        maskClosable
      >
        {batchResult && (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Progress
              percent={
                batchResult.success.length + batchResult.failed.length === 0
                  ? 0
                  : Math.round(
                      (batchResult.success.length /
                        (batchResult.success.length + batchResult.failed.length)) *
                        100
                    )
              }
              status={batchResult.failed.length === 0 ? 'success' : 'normal'}
              format={() =>
                `${batchResult.success.length} / ${
                  batchResult.success.length + batchResult.failed.length
                }`
              }
            />

            {batchResult.success.length > 0 && (
              <Card size="small" title={`✅ 归档成功（${batchResult.success.length} 例）`}>
                <List
                  size="small"
                  dataSource={batchResult.success}
                  renderItem={(cid) => {
                    const c = cases.find((x) => x.id === cid)
                    const w = batchResult.warnings.find((x) => x.caseId === cid)
                    return (
                      <List.Item
                        actions={
                          w
                            ? [
                                <Tag color="orange" key="w">
                                  有提醒
                                </Tag>
                              ]
                            : undefined
                        }
                      >
                        <List.Item.Meta
                          avatar={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                          title={
                            c
                              ? `${c.patient.name}（${c.patient.hospitalNumber}）· ${c.surgeryName}`
                              : `病例 ID: ${cid}`
                          }
                          description={
                            w ? (
                              <ul style={{ margin: 0, paddingLeft: 18 }}>
                                {w.items.map((x, i) => (
                                  <li key={i}>
                                    <Text type="warning">{x}</Text>
                                  </li>
                                ))}
                              </ul>
                            ) : c ? (
                              <Text type="success">
                                已由 {c.archivedBy || currentUser} 归档于 {c.archivedAt}
                              </Text>
                            ) : null
                          }
                        />
                      </List.Item>
                    )
                  }}
                />
              </Card>
            )}

            {batchResult.failed.length > 0 && (
              <Card size="small" title={`❌ 归档失败（${batchResult.failed.length} 例）`}>
                <List
                  size="small"
                  dataSource={batchResult.failed}
                  renderItem={(f) => {
                    const c = cases.find((x) => x.id === f.caseId)
                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<ExclamationCircleOutlined style={{ color: '#cf1322' }} />}
                          title={
                            c
                              ? `${c.patient.name}（${c.patient.hospitalNumber}）· ${c.surgeryName}`
                              : `病例 ID: ${f.caseId}`
                          }
                          description={
                            <Text type="danger" style={{ whiteSpace: 'pre-wrap' }}>
                              原因：{f.reason}
                            </Text>
                          }
                        />
                      </List.Item>
                    )
                  }}
                />
              </Card>
            )}

            {batchResult.warnings.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`共 ${batchResult.warnings.length} 例存在提醒项，已归档但建议核对`}
              />
            )}
          </Space>
        )}
      </Modal>

      {handoverCaseId && (
        <ArchiveHandoverModal
          open={handoverVisible}
          caseId={handoverCaseId}
          onClose={() => {
            setHandoverVisible(false)
            setHandoverCaseId(null)
          }}
        />
      )}
    </div>
  )
}
