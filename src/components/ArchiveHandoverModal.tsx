import React from 'react'
import {
  Modal,
  Card,
  Descriptions,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Space,
  Button,
  Typography,
  Divider,
  Alert,
  Empty
} from 'antd'
import {
  PrinterOutlined,
  DownloadOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  HeartOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAppStore } from '../store'
import type {
  SurgicalCase,
  QualityCheckItem,
  SupplyItem,
  SurgicalStage
} from '../types'
import {
  SurgicalStageLabels,
  ImagingDeviceLabels,
  VerifierRoleLabels,
  ArchiveStatusLabels
} from '../types'

const { Title, Text } = Typography

interface ArchiveHandoverModalProps {
  open: boolean
  caseId: string
  onClose: () => void
}

export const ArchiveHandoverModal: React.FC<ArchiveHandoverModalProps> = ({
  open,
  caseId,
  onClose
}) => {
  const { getCaseById, getQualityCheckItems } = useAppStore()
  const caseData = caseId ? getCaseById(caseId) : undefined
  const qualityItems = caseId ? getQualityCheckItems(caseId) : []

  const handlePrint = () => {
    window.print()
  }

  const handleExportTxt = () => {
    if (!caseData) return
    const lines: string[] = []
    lines.push('==================================================')
    lines.push('          介入手术室影像归档交接单')
    lines.push('==================================================')
    lines.push('')
    lines.push(`交接单号：${caseData.id}`)
    lines.push(`生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`)
    lines.push(`归档时间：${caseData.archivedAt || '未归档'}`)
    lines.push(`归档操作人：${caseData.archivedBy || '-'}`)
    lines.push(`病例状态：${ArchiveStatusLabels[caseData.status]}`)
    lines.push('')
    lines.push('────────── 患者信息 ──────────')
    lines.push(`  姓名：${caseData.patient.name}`)
    lines.push(`  住院号：${caseData.patient.hospitalNumber}`)
    lines.push(`  性别：${caseData.patient.gender === 'male' ? '男' : '女'}`)
    lines.push(`  年龄：${caseData.patient.age} 岁`)
    lines.push(`  科室：${caseData.patient.department}`)
    lines.push('')
    lines.push('────────── 手术信息 ──────────')
    lines.push(`  手术名称：${caseData.surgeryName}`)
    lines.push(`  术者：${caseData.surgeon}`)
    if (caseData.assistantSurgeon) lines.push(`  助手：${caseData.assistantSurgeon}`)
    lines.push(`  手术间：${caseData.operatingRoom}`)
    lines.push(`  开始时间：${caseData.startTime}`)
    if (caseData.endTime) lines.push(`  结束时间：${caseData.endTime}`)
    lines.push('')
    lines.push('────────── 影像资料 ──────────')
    lines.push(`  总数量：${caseData.mediaItems.length} 个`)
    const byDevice: Record<string, number> = {}
    const byStage: Record<string, number> = {}
    let unstaged = 0
    caseData.mediaItems.forEach((m) => {
      byDevice[m.device] = (byDevice[m.device] || 0) + 1
      if (m.stage) {
        byStage[m.stage] = (byStage[m.stage] || 0) + 1
      } else {
        unstaged += 1
      }
    })
    lines.push('  按设备分布：')
    Object.entries(byDevice).forEach(([d, n]) => {
      lines.push(`    - ${ImagingDeviceLabels[d as keyof typeof ImagingDeviceLabels] || d}：${n} 个`)
    })
    lines.push('  按阶段分布：')
    Object.entries(byStage).forEach(([s, n]) => {
      lines.push(
        `    - ${SurgicalStageLabels[s as SurgicalStage] || s}：${n} 个`
      )
    })
    if (unstaged > 0) lines.push(`  未标记阶段：${unstaged} 个`)
    lines.push('')
    lines.push('────────── 耗材登记 ──────────')
    if (caseData.supplies.length === 0) {
      lines.push('  （未登记）')
    } else {
      caseData.supplies.forEach((s, i) => {
        lines.push(
          `  ${i + 1}. ${s.name} × ${s.quantity}${s.unit}  批号：${s.batchNumber || '未填'}${
            s.manufacturer ? `  厂商：${s.manufacturer}` : ''
          }`
        )
      })
    }
    lines.push('')
    lines.push('────────── 造影剂使用 ──────────')
    if (!caseData.contrastAgent) {
      lines.push('  （未登记）')
    } else {
      const ca = caseData.contrastAgent
      lines.push(`  名称：${ca.name || '未填'}`)
      lines.push(`  用量：${ca.dosage || 0}${ca.unit || ''}`)
      if (ca.batchNumber) lines.push(`  批号：${ca.batchNumber}`)
    }
    lines.push('')
    lines.push('────────── 双人核对 ──────────')
    const vRecords = caseData.verificationRecords || []
    if (vRecords.length === 0) {
      lines.push('  （未开始）')
    } else {
      vRecords.forEach((r) => {
        lines.push(
          `  ${VerifierRoleLabels[r.role]}：${r.verifier}   时间：${r.time}`
        )
      })
    }
    lines.push('')
    lines.push('────────── 归档质控 ──────────')
    qualityItems.forEach((item) => {
      const status = item.passed ? '✓ 通过' : '✗ 未通过'
      lines.push(`  [${status}] ${item.label}`)
      item.messages.forEach((m) => {
        lines.push(`      - ${m}`)
      })
    })
    lines.push('')
    lines.push('==================================================')
    lines.push('              （交接单自动生成，请勿手工修改）')
    lines.push('==================================================')

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `归档交接单-${caseData.patient.name}-${caseData.patient.hospitalNumber}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getCategoryColor = (cat: QualityCheckItem['category']) => {
    switch (cat) {
      case 'pass':
        return 'green'
      case 'error':
        return 'red'
      case 'warning':
        return 'orange'
      case 'info':
      default:
        return 'blue'
    }
  }

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <Text strong>归档交接单预览</Text>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={880}
      footer={
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            打印
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportTxt}>
            导出 TXT
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
      destroyOnClose
      className="handover-modal"
    >
      {caseData ? (
        <div id="handover-print-area" style={{ background: '#fff', padding: 8 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              介入手术室影像归档交接单
            </Title>
            <Text type="secondary">
              交接单号：{caseData.id} · 生成时间：{dayjs().format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>

          <Card size="small" title={<Space><HeartOutlined /> 患者信息</Space>} style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="姓名">{caseData.patient.name}</Descriptions.Item>
              <Descriptions.Item label="住院号">{caseData.patient.hospitalNumber}</Descriptions.Item>
              <Descriptions.Item label="性别">
                {caseData.patient.gender === 'male' ? '男' : '女'}
              </Descriptions.Item>
              <Descriptions.Item label="年龄">{caseData.patient.age} 岁</Descriptions.Item>
              <Descriptions.Item label="科室" span={2}>
                {caseData.patient.department}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title={<Space><UserOutlined /> 手术信息</Space>} style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="手术名称" span={2}>
                {caseData.surgeryName}
              </Descriptions.Item>
              <Descriptions.Item label="术者">{caseData.surgeon}</Descriptions.Item>
              <Descriptions.Item label="助手">{caseData.assistantSurgeon || '—'}</Descriptions.Item>
              <Descriptions.Item label="手术间">{caseData.operatingRoom}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={caseData.status === 'archived' ? 'green' : 'blue'}>
                  {ArchiveStatusLabels[caseData.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">{caseData.startTime}</Descriptions.Item>
              <Descriptions.Item label="结束时间">{caseData.endTime || '—'}</Descriptions.Item>
              <Descriptions.Item label="归档时间" span={2}>
                {caseData.archivedAt || '未归档'}
                {caseData.archivedBy ? `（${caseData.archivedBy}）` : ''}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title={<Space><FileTextOutlined /> 影像资料</Space>} style={{ marginBottom: 12 }}>
            <Row gutter={[8, 8]}>
              <Col span={6}>
                <Statistic title="总数量" value={caseData.mediaItems.length} suffix="个" />
              </Col>
              <Col span={18}>
                <Row gutter={[6, 6]}>
                  {Object.entries(
                    caseData.mediaItems.reduce<Record<string, number>>((acc, m) => {
                      acc[m.device] = (acc[m.device] || 0) + 1
                      return acc
                    }, {})
                  ).map(([dev, n]) => (
                    <Col key={dev}>
                      <Tag color="geekblue">
                        {ImagingDeviceLabels[dev as keyof typeof ImagingDeviceLabels] || dev}：{n} 个
                      </Tag>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={[8, 8]}>
              {Object.entries(
                caseData.mediaItems.reduce<Record<string, number>>((acc, m) => {
                  const key = m.stage || 'unstaged'
                  acc[key] = (acc[key] || 0) + 1
                  return acc
                }, {})
              ).map(([stage, n]) => (
                <Col key={stage} xs={12} sm={8} md={6}>
                  <Tag color={stage === 'unstaged' ? 'red' : 'green'} style={{ width: '100%', textAlign: 'center', padding: '6px 0' }}>
                    {stage === 'unstaged' ? '未标记' : SurgicalStageLabels[stage as SurgicalStage]}：{n}
                  </Tag>
                </Col>
              ))}
            </Row>
          </Card>

          <Card size="small" title={<Space><FileTextOutlined /> 耗材登记</Space>} style={{ marginBottom: 12 }}>
            {caseData.supplies.length === 0 ? (
              <Empty description="未登记耗材" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={caseData.supplies}
                renderItem={(s: SupplyItem) => (
                  <List.Item>
                    <List.Item.Meta
                      title={s.name}
                      description={
                        <Space>
                          <Tag>数量：{s.quantity}{s.unit}</Tag>
                          <Tag color="blue">批号：{s.batchNumber || '未填'}</Tag>
                          {s.manufacturer && <Tag color="geekblue">厂商：{s.manufacturer}</Tag>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card size="small" title={<Space><SafetyOutlined /> 造影剂使用</Space>} style={{ marginBottom: 12 }}>
            {!caseData.contrastAgent ? (
              <Empty description="未登记造影剂使用" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Descriptions size="small" column={3} bordered>
                <Descriptions.Item label="名称">{caseData.contrastAgent.name}</Descriptions.Item>
                <Descriptions.Item label="用量">
                  {caseData.contrastAgent.dosage}{caseData.contrastAgent.unit || ''}
                </Descriptions.Item>
                <Descriptions.Item label="批号">
                  {caseData.contrastAgent.batchNumber || '—'}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>

          <Card size="small" title={<Space><CheckCircleOutlined /> 双人核对</Space>} style={{ marginBottom: 12 }}>
            {caseData.verificationRecords.length === 0 ? (
              <Empty description="未开始核对" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Row gutter={16}>
                {caseData.verificationRecords.map((r) => (
                  <Col key={r.id} xs={24} sm={12}>
                    <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
                      <Statistic
                        title={VerifierRoleLabels[r.role]}
                        value={r.verifier}
                        prefix={<UserOutlined />}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        时间：{r.time}
                      </Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>

          <Card size="small" title={<Space><SafetyOutlined /> 归档质控结果</Space>}>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={6}>
                <Statistic
                  title="通过项"
                  value={qualityItems.filter((i) => i.passed).length}
                  suffix={`/ ${qualityItems.length}`}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="错误项"
                  value={qualityItems.filter((i) => i.category === 'error').length}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="提醒项"
                  value={qualityItems.filter((i) => i.category === 'warning').length}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="提示项"
                  value={qualityItems.filter((i) => i.category === 'info').length}
                />
              </Col>
            </Row>
            {qualityItems.some((i) => i.category === 'error') && (
              <Alert
                type="error"
                showIcon
                message="存在未通过的质控项"
                style={{ marginBottom: 12 }}
              />
            )}
            <List
              size="small"
              dataSource={qualityItems}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Tag color={getCategoryColor(item.category)}>{item.label}</Tag>}
                    title={
                      <Space>
                        {item.passed ? (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <SafetyOutlined style={{ color: '#cf1322' }} />
                        )}
                        <Text strong>{item.passed ? '通过' : '需关注'}</Text>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        {item.messages.map((m, i) => (
                          <Text key={i} type="secondary">• {m}</Text>
                        ))}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>

          <div
            style={{
              marginTop: 24,
              textAlign: 'center',
              fontSize: 12,
              color: '#999',
              borderTop: '1px dashed #ddd',
              paddingTop: 8
            }}
          >
            本交接单由介入手术室影像归档系统自动生成，请勿手工修改
          </div>
        </div>
      ) : (
        <Empty description="未找到病例" />
      )}
    </Modal>
  )
}
