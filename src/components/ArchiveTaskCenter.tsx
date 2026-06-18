import React, { useState } from 'react'
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Drawer,
  Descriptions,
  List,
  Statistic,
  Row,
  Col,
  Empty,
  Typography,
  Tabs,
  Badge,
  Alert,
  Modal,
  Collapse,
  Divider
} from 'antd'
import {
  HistoryOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  SafetyOutlined,
  CaretRightOutlined,
  EnvironmentOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAppStore } from '../store'
import type { ArchiveTask, ArchiveTaskCaseResult, QualityCheckItem } from '../types'
import { ArchiveStatusLabels, VerifierRoleLabels, SurgicalStageLabels } from '../types'
import { ArchiveHandoverModal } from './ArchiveHandoverModal'

const { Title, Text } = Typography
const { TabPane } = Tabs

const getTaskStatusColor = (status: ArchiveTask['status']) => {
  const map: Record<ArchiveTask['status'], string> = {
    running: 'processing',
    success: 'success',
    partial: 'warning',
    failed: 'error'
  }
  return map[status]
}

const getTaskStatusText = (status: ArchiveTask['status']) => {
  const map: Record<ArchiveTask['status'], string> = {
    running: '执行中',
    success: '全部成功',
    partial: '部分成功',
    failed: '全部失败'
  }
  return map[status]
}

const getCaseStatusIcon = (status: ArchiveTaskCaseResult['status']) => {
  switch (status) {
    case 'success':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    case 'failed':
      return <CloseCircleOutlined style={{ color: '#cf1322' }} />
    case 'skipped':
      return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
  }
}

const getCaseStatusText = (status: ArchiveTaskCaseResult['status']) => {
  switch (status) {
    case 'success':
      return '归档成功'
    case 'failed':
      return '归档失败'
    case 'skipped':
      return '已跳过'
  }
}

export const ArchiveTaskCenter: React.FC = () => {
  const { archiveTasks, getArchiveTaskById, navigateTo } = useAppStore()
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [handoverCaseId, setHandoverCaseId] = useState<string | null>(null)
  const [handoverVisible, setHandoverVisible] = useState(false)

  const selectedTask = selectedTaskId ? getArchiveTaskById(selectedTaskId) : null

  const stats = {
    total: archiveTasks.length,
    success: archiveTasks.filter((t) => t.status === 'success').length,
    partial: archiveTasks.filter((t) => t.status === 'partial').length,
    failed: archiveTasks.filter((t) => t.status === 'failed').length
  }

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (name: string, record: ArchiveTask) => (
        <Space>
          <HistoryOutlined style={{ color: '#1677ff' }} />
          <Text strong>{name}</Text>
          <Tag color={getTaskStatusColor(record.status)}>{getTaskStatusText(record.status)}</Tag>
        </Space>
      )
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180
    },
    {
      title: '完成时间',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      width: 180,
      render: (v?: string) => v || <Text type="secondary">—</Text>
    },
    {
      title: '总数',
      dataIndex: 'totalCount',
      key: 'totalCount',
      width: 80,
      align: 'center' as const
    },
    {
      title: '成功',
      dataIndex: 'successCount',
      key: 'successCount',
      width: 80,
      align: 'center' as const,
      render: (n: number) => <Text type="success">{n}</Text>
    },
    {
      title: '失败',
      dataIndex: 'failedCount',
      key: 'failedCount',
      width: 80,
      align: 'center' as const,
      render: (n: number) => (n > 0 ? <Text type="danger">{n}</Text> : n)
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ArchiveTask) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedTaskId(record.id)
            setDetailVisible(true)
          }}
        >
          查看详情
        </Button>
      )
    }
  ]

  const handleViewHandover = (caseId: string) => {
    setHandoverCaseId(caseId)
    setHandoverVisible(true)
  }

  const handleJumpToCase = (caseId: string) => {
    navigateTo('archive', {
      caseId,
      fromTab: 'archive_tasks',
      openArchiveDetail: true,
      openDetailTab: 'quality'
    })
    setDetailVisible(false)
  }

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="任务总数" value={stats.total} prefix={<HistoryOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="全部成功"
                value={stats.success}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="部分成功"
                value={stats.partial}
                valueStyle={{ color: '#faad14' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="全部失败"
                value={stats.failed}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card
        size="small"
        title={
          <Space>
            <FileTextOutlined />
            <Text>归档任务列表</Text>
            <Tag color="blue">{archiveTasks.length}</Tag>
          </Space>
        }
        style={{ flex: 1, overflow: 'auto' }}
        bodyStyle={{ padding: 0 }}
      >
        {archiveTasks.length === 0 ? (
          <Empty
            description="暂无归档任务"
            style={{ padding: 48 }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={archiveTasks}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条任务`
            }}
            scroll={{ y: 400 }}
          />
        )}
      </Card>

      <Drawer
        title={
          <Space>
            <HistoryOutlined />
            <Text strong>归档任务详情</Text>
          </Space>
        }
        width={720}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        destroyOnClose
      >
        {selectedTask && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" title="任务概览">
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="任务名称">{selectedTask.name}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={getTaskStatusColor(selectedTask.status)}>
                    {getTaskStatusText(selectedTask.status)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="操作人">{selectedTask.operator}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{selectedTask.createdAt}</Descriptions.Item>
                <Descriptions.Item label="完成时间">
                  {selectedTask.finishedAt || (
                    <Text type="secondary">执行中...</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="病例总数">{selectedTask.totalCount} 例</Descriptions.Item>
                <Descriptions.Item label="成功">
                  <Text type="success">{selectedTask.successCount} 例</Text>
                </Descriptions.Item>
                <Descriptions.Item label="失败">
                  <Text type="danger">{selectedTask.failedCount} 例</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="逐病例结果（点击展开完整追溯）">
              <Collapse
                accordion
                expandIcon={({ isActive }) => (
                  <CaretRightOutlined rotate={isActive ? 90 : 0} />
                )}
                items={selectedTask.caseResults.map((item) => {
                  const sn = item.qualityCheckSnapshot
                  return {
                    key: item.caseId,
                    label: (
                      <Space wrap style={{ width: '100%' }}>
                        {getCaseStatusIcon(item.status)}
                        <Text strong>
                          {item.patientName}（{item.hospitalNumber}）
                        </Text>
                        <Tag
                          color={
                            item.status === 'success'
                              ? 'green'
                              : item.status === 'failed'
                              ? 'red'
                              : 'orange'
                          }
                        >
                          {getCaseStatusText(item.status)}
                        </Tag>
                        <Tag color="blue">{item.surgeryName}</Tag>
                        {sn && (
                          <Tag icon={<SafetyOutlined />} color="geekblue">
                            质控 {sn.summary.passed}/{sn.summary.total}（错{sn.summary.errorCount}·警
                            {sn.summary.warningCount}）
                          </Tag>
                        )}
                      </Space>
                    ),
                    children: (
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Descriptions size="small" column={2} bordered>
                          <Descriptions.Item label="归档操作者">
                            <Space>
                              <UserOutlined />
                              {sn?.operator || selectedTask.operator}
                            </Space>
                          </Descriptions.Item>
                          <Descriptions.Item label="归档时间">
                            <Space>
                              <ClockCircleOutlined />
                              {sn?.createdAt || selectedTask.finishedAt || '未完成'}
                            </Space>
                          </Descriptions.Item>
                        </Descriptions>

                        {item.status === 'failed' && item.reason && (
                          <Alert type="error" showIcon message={`归档失败：${item.reason}`} />
                        )}
                        {item.status === 'skipped' && item.reason && (
                          <Alert type="warning" showIcon message={`已跳过：${item.reason}`} />
                        )}

                        {item.warnings && item.warnings.length > 0 && (
                          <Alert
                            type="warning"
                            showIcon
                            message={`${item.warnings.length} 项提醒`}
                            description={
                              <ul style={{ margin: 0, paddingLeft: 18 }}>
                                {item.warnings.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            }
                          />
                        )}

                        <Divider orientation="left" style={{ margin: '4px 0' }}>
                          <Text strong>
                            <SafetyOutlined /> 质控清单逐项结果
                            {sn
                              ? `（快照时间：${sn.createdAt} · ${sn.operator}）`
                              : '（失败/跳过病例已保留当时检查结果）'}
                          </Text>
                        </Divider>

                        {sn ? (
                          <List
                            size="small"
                            dataSource={sn.items}
                            renderItem={(qi) => {
                              const statusColor: Record<
                                QualityCheckItem['category'],
                                string
                              > = {
                                pass: 'green',
                                error: 'red',
                                warning: 'orange',
                                info: 'blue'
                              }
                              return (
                                <List.Item>
                                  <List.Item.Meta
                                    avatar={
                                      <Tag color={statusColor[qi.category]}>
                                        {qi.label}
                                      </Tag>
                                    }
                                    title={
                                      <Space>
                                        {qi.passed ? (
                                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                        ) : qi.category === 'error' ? (
                                          <CloseCircleOutlined style={{ color: '#cf1322' }} />
                                        ) : (
                                          <ExclamationCircleOutlined
                                            style={{ color: '#faad14' }}
                                          />
                                        )}
                                        <Text strong>
                                          {qi.passed
                                            ? '通过'
                                            : qi.category === 'error'
                                            ? '错误'
                                            : qi.category === 'warning'
                                            ? '提醒'
                                            : '提示'}
                                        </Text>
                                        {qi.targetWindow && (
                                          <Tag color="geekblue">
                                            <EnvironmentOutlined />{' '}
                                            {qi.targetWindow === 'collection'
                                              ? '术中采集'
                                              : qi.targetWindow === 'verification'
                                              ? '病例核对'
                                              : '归档列表'}
                                          </Tag>
                                        )}
                                      </Space>
                                    }
                                    description={
                                      qi.messages.length > 0 ? (
                                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                                          {qi.messages.map((m, mi) => (
                                            <li key={mi} style={{ fontSize: 12 }}>
                                              <Text type="secondary">{m}</Text>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                          无问题
                                        </Text>
                                      )
                                    }
                                  />
                                </List.Item>
                              )
                            }}
                          />
                        ) : (
                          <Empty description="未记录质控快照" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}

                        <Row justify="end" gutter={8}>
                          {item.status === 'success' && (
                            <Col>
                              <Button
                                size="small"
                                icon={<FileTextOutlined />}
                                onClick={() => handleViewHandover(item.caseId)}
                              >
                                归档交接单
                              </Button>
                            </Col>
                          )}
                          <Col>
                            <Button
                              size="small"
                              type="primary"
                              icon={<EyeOutlined />}
                              onClick={() => handleJumpToCase(item.caseId)}
                            >
                              打开病例详情（质控页）
                            </Button>
                          </Col>
                        </Row>
                      </Space>
                    )
                  }
                })}
              />
            </Card>

            {selectedTask.failedCount > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`共 ${selectedTask.failedCount} 例归档失败，已跳过不影响其他病例`}
                description="建议前往「病例核对」补齐缺失信息后，重新在归档列表中勾选并执行归档。"
              />
            )}
          </Space>
        )}
      </Drawer>

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
