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
  Modal
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
  SafetyOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAppStore } from '../store'
import type { ArchiveTask, ArchiveTaskCaseResult } from '../types'
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
    navigateTo('archive', { caseId, fromTab: 'archive_tasks' })
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

            <Card size="small" title="逐病例结果">
              <List
                dataSource={selectedTask.caseResults}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      item.status === 'success' ? (
                        <Button
                          key="handover"
                          type="link"
                          size="small"
                          icon={<FileTextOutlined />}
                          onClick={() => handleViewHandover(item.caseId)}
                        >
                          交接单
                        </Button>
                      ) : null,
                      <Button
                        key="view"
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleJumpToCase(item.caseId)}
                      >
                        查看病例
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={getCaseStatusIcon(item.status)}
                      title={
                        <Space>
                          <Text strong>
                            {item.patientName}（{item.hospitalNumber}）
                          </Text>
                          <Tag>{getCaseStatusText(item.status)}</Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Text type="secondary">{item.surgeryName}</Text>
                          {item.reason && (
                            <Alert
                              type={item.status === 'failed' ? 'error' : 'warning'}
                              message={item.reason}
                              showIcon
                              style={{ padding: '4px 8px' }}
                            />
                          )}
                          {item.warnings && item.warnings.length > 0 && (
                            <Alert
                              type="warning"
                              message={`${item.warnings.length} 项提醒`}
                              description={
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                  {item.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </ul>
                              }
                              showIcon
                              style={{ padding: '4px 8px' }}
                            />
                          )}
                          {item.status === 'success' && item.qualityCheckSnapshot && (
                            <div style={{ marginTop: 4 }}>
                              <Tag icon={<SafetyOutlined />} color="green">
                                质控通过 {item.qualityCheckSnapshot.summary.passed}/
                                {item.qualityCheckSnapshot.summary.total}
                              </Tag>
                              {item.qualityCheckSnapshot.summary.errorCount > 0 && (
                                <Tag color="red">
                                  错误 {item.qualityCheckSnapshot.summary.errorCount}
                                </Tag>
                              )}
                              {item.qualityCheckSnapshot.summary.warningCount > 0 && (
                                <Tag color="orange">
                                  提醒 {item.qualityCheckSnapshot.summary.warningCount}
                                </Tag>
                              )}
                            </div>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
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
