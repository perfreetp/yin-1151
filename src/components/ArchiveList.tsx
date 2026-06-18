import React, { useState } from 'react'
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
  Divider
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
  ExclamationCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAppStore } from '../store'
import type {
  SurgicalCase,
  SearchFilters,
  ArchiveStatus,
  MediaItem,
  SupplyItem
} from '../types'
import {
  SurgicalStageLabels,
  ImagingDeviceLabels,
  MediaTypeLabels,
  ArchiveStatusLabels
} from '../types'

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
  const [selectedCase, setSelectedCase] = useState<SurgicalCase | null>(null)
  const [archiveConfirmVisible, setArchiveConfirmVisible] = useState(false)
  const [searchForm] = Form.useForm<SearchFormData>()

  const {
    cases,
    archiveLogs,
    currentUser,
    searchFilters,
    setSearchFilters,
    searchCases,
    checkCaseIntegrity,
    archiveCase
  } = useAppStore()

  const filteredCases = searchCases(searchFilters)

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
  const caseLogs = selectedCase
    ? archiveLogs.filter((l) => l.caseId === selectedCase.id).reverse()
    : []

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
          <Space>
            <FolderOpenOutlined />
            <Text>病例列表</Text>
            <Tag color="blue">{filteredCases.length}</Tag>
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
          <Tabs defaultActiveKey="basic">
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

              {selectedCase.verifiedBy && selectedCase.verifiedBy.length > 0 && (
                <Card size="small" title="核对记录" style={{ marginBottom: 16 }}>
                  <Space>
                    {selectedCase.verifiedBy.map((v, idx) => (
                      <Tag key={idx} color="green" icon={<CheckCircleOutlined />}>
                        {v} 已确认
                      </Tag>
                    ))}
                    {selectedCase.verificationTime && (
                      <Text type="secondary">核对时间: {selectedCase.verificationTime}</Text>
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
          </Tabs>
        )}
      </Drawer>

      <Modal
        title="确认归档"
        open={archiveConfirmVisible}
        onOk={handleConfirmArchive}
        onCancel={() => setArchiveConfirmVisible(false)}
        okText="确认归档"
        okButtonProps={{ danger: false, type: 'primary' }}
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

            {integrityCheck && integrityCheck.errors.length === 0 && integrityCheck.warnings.length > 0 && (
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

            {integrityCheck && integrityCheck.errors.length === 0 && integrityCheck.warnings.length === 0 && (
              <Alert message="资料完整，可以归档" type="success" showIcon />
            )}

            <Text type="secondary">
              <HistoryOutlined /> 归档后将生成可追溯的归档记录，数据不可修改。
            </Text>
          </Space>
        )}
      </Modal>
    </div>
  )
}
